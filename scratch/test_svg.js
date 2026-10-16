const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="grad"><stop stop-color="#10b981"/></linearGradient></defs><rect fill="url(#grad)"/></svg>';
console.log('encoded:', encodeURIComponent(svg));
console.log('base64:', Buffer.from(svg).toString('base64'));
