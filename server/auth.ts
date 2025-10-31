// Ensure this is only imported on server side
if (typeof window !== 'undefined') {
  throw new Error('Authentication cannot be used on client side');
}

import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as LocalStrategy } from "passport-local";
import bcryptjs from "bcryptjs";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectMongo from "connect-mongodb-session";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const provider = (process.env.DB_PROVIDER || 'postgres').toLowerCase();

  if (provider === 'mongo') {
    try {
      const MongoDBStore = connectMongo(session);
      const sessionStore = new MongoDBStore({
        uri: process.env.MONGODB_URI!,
        databaseName: process.env.MONGODB_DB_NAME,
        collection: 'sessions',
        // Add connection options for better reliability
        connectionOptions: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 10000,
        },
      });

      // Handle session store errors gracefully
      sessionStore.on('error', (error) => {
        });

      return session({
        secret: process.env.SESSION_SECRET!,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: sessionTtl,
        },
        rolling: true,
        name: 'connect.sid',
        // Add session cleanup
        unset: 'destroy',
        proxy: true,
      });
    } catch (error) {
      }
  }

  // Fallback to memory store if not MongoDB
  return session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
    rolling: true,
    name: 'connect.sid',
  });
}

async function upsertUser(claims: any, provider: 'google' | 'github' | 'local' = 'local') {
  const email = claims["email"];
  const userData: any = {
    email: email ? email.toLowerCase().trim() : null,
    firstName: claims["first_name"] || claims["given_name"] || claims["name"]?.split(' ')[0],
    lastName: claims["last_name"] || claims["family_name"] || claims["name"]?.split(' ').slice(1).join(' '),
    profileImageUrl: claims["profile_image_url"] || claims["picture"] || claims["avatar_url"],
    authProvider: provider,
  };

  if (provider === 'google') {
    userData.googleId = claims["sub"];
  } else if (provider === 'github') {
    userData.githubId = claims["id"];
  }

  await storage.upsertUser(userData);
}

// Middleware to check user status after authentication
const checkUserStatus = async (req: any, res: any, next: any) => {
  if (req.user) {
    try {
      const userId = req.user?.claims?.sub || req.user?.profile?.id;
      if (userId) {
        const user = await storage.getUserWithRole(userId);
        if (user && user.status === 'inactive') {
          req.logout((err: any) => {
            if (err) {
              // Handle logout error silently
            }
          });
          return res.status(401).json({ message: 'Account is inactive' });
        }
        
      }
    } catch (error) {
      }
  }
  next();
};

export function setupAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.passwordHash) {
          return done(null, false, { message: 'Please set a password for your account' });
        }

        const isValidPassword = await bcryptjs.compare(password, user.passwordHash);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (user.status === 'inactive') {
          return done(null, false, { message: 'Account is inactive' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const claims = {
          sub: profile.id,
          email: profile.emails?.[0]?.value,
          given_name: profile.name?.givenName,
          family_name: profile.name?.familyName,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
        };
        await upsertUser(claims, 'google');
        return done(null, { claims });
      } catch (error) {
        return done(error);
      }
    }));
  }

  // GitHub Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/auth/github/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const claims = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          avatar_url: profile.photos?.[0]?.value,
        };
        await upsertUser(claims, 'github');
        return done(null, { claims });
      } catch (error) {
        return done(error);
      }
    }));
  }

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // Auth routes
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login error' });
        }
        return res.json({ message: 'Login successful', user: { id: user.id, email: user.email } });
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout error' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

  // GET logout route for fallback
  app.get('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout error' });
      }
      res.redirect('/');
    });
  });

  // Google OAuth routes
  if (process.env.GOOGLE_CLIENT_ID) {
    app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
    app.get('/api/auth/google/callback', 
      passport.authenticate('google', { failureRedirect: '/login' }),
      (req, res) => {
        res.redirect('/');
      }
    );
  }

  // GitHub OAuth routes
  if (process.env.GITHUB_CLIENT_ID) {
    app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
    app.get('/api/auth/github/callback',
      passport.authenticate('github', { failureRedirect: '/login' }),
      (req, res) => {
        res.redirect('/');
      }
    );
  }

  // User info endpoint - DISABLED: Using the new endpoint in routes.ts instead
  // app.get('/api/auth/user', checkUserStatus, (req, res) => {
  //   if (req.user) {
  //     const userId = req.user?.claims?.sub || req.user?.profile?.id || req.user?.id;
  //     if (userId) {
  //       storage.getUser(userId).then(user => {
  //         if (user) {
  //           res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
  //         } else {
  //           res.status(404).json({ message: 'User not found' });
  //         }
  //       }).catch(() => {
  //         res.status(500).json({ message: 'Error fetching user' });
  //       });
  //     } else {
  //       res.status(401).json({ message: 'Not authenticated' });
  //     }
  //   } else {
  //     res.status(401).json({ message: 'Not authenticated' });
  //   }
  // });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};
