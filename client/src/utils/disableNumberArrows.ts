// Utility to disable arrow key increment/decrement on number inputs
export const disableNumberInputArrows = () => {
  // Add event listener to disable arrow keys on number inputs
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
      // Disable arrow up (38) and arrow down (40) keys
      if (e.keyCode === 38 || e.keyCode === 40) {
        e.preventDefault();
      }
    }
  });
};

// Also disable wheel scrolling on number inputs
export const disableNumberInputWheel = () => {
  document.addEventListener('wheel', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
      // Only prevent if the input is focused
      if (target === document.activeElement) {
        e.preventDefault();
      }
    }
  }, { passive: false });
};