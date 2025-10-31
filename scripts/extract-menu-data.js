// Script to help extract menu and proposal data
// Run this to get the file contents as text

const fs = require('fs');
const path = require('path');

console.log('📋 Reference Files Found:');
console.log('1. tests/Veg.pdf - Vegetarian menu');
console.log('2. tests/Non veg.pdf - Non-vegetarian menu'); 
console.log('3. tests/sample proposal.xlsx - Sample quotation format');

console.log('\n📝 To extract data:');
console.log('1. Open the PDF files and copy-paste menu items');
console.log('2. Open the Excel file and copy-paste proposal structure');
console.log('3. Share the data structure here');

console.log('\n🎯 Expected Menu Structure:');
console.log('- Item Name');
console.log('- Category (Veg/Non-Veg)');
console.log('- Price');
console.log('- Description');
console.log('- Available (Yes/No)');

console.log('\n🏨 Expected Room Structure:');
console.log('- Room Type');
console.log('- Capacity');
console.log('- Price per night');
console.log('- Amenities');
console.log('- Available');

console.log('\n📄 Expected Proposal Structure:');
console.log('- Client details');
console.log('- Event details');
console.log('- Selected menu items');
console.log('- Selected rooms');
console.log('- Total pricing');
console.log('- Terms and conditions');



