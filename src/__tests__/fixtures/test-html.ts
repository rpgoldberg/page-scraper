// Test HTML fixtures for scraping logic tests
export const MFC_FIGURE_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Figure - My Figure Collection</title>
</head>
<body>
    <div class="item-picture">
        <div class="main">
            <img src="https://static.myfigurecollection.net/pics/figure/large/123456.jpg" alt="Test Figure">
        </div>
    </div>
    
    <div class="data-field">
        <div class="data-label">Company</div>
        <div class="data-value">
            <div class="item-entries">
                <a href="/manufacturer/123">
                    <span switch>Good Smile Company</span>
                </a>
            </div>
        </div>
    </div>
    
    <div class="data-field">
        <div class="data-label">Character</div>
        <div class="data-value">
            <div class="item-entries">
                <a href="/character/456">
                    <span switch>Hatsune Miku</span>
                </a>
            </div>
        </div>
    </div>
    
    <div class="item-scale">1/7</div>
</body>
</html>
`;

export const CLOUDFLARE_CHALLENGE_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Just a moment...</title>
</head>
<body>
    <div>Just a moment...</div>
    <div>Please wait while we verify you are a human.</div>
</body>
</html>
`;

export const CLOUDFLARE_CHALLENGE_VARIATIONS = {
  BROWSER_CHECK: `
<!DOCTYPE html>
<html>
<head>
    <title>Checking your browser</title>
</head>
<body>
    <div>Checking your browser before accessing the website.</div>
    <div>This process is automatic. Your browser will redirect automatically.</div>
</body>
</html>
`,
  DDOS_PROTECTION: `
<!DOCTYPE html>
<html>
<head>
    <title>DDoS protection</title>
</head>
<body>
    <div>DDoS protection by Cloudflare</div>
    <div>Please enable JavaScript and cookies to continue</div>
    <div>Ray ID: 1234567890abcdef</div>
</body>
</html>
`,
  FUZZY_VARIATIONS: `
<!DOCTYPE html>
<html>
<head>
    <title>Just  a   moment please...</title>
</head>
<body>
    <div>Please wait while  we  verify you are human</div>
    <div>JavaScript is required for this site to function properly</div>
</body>
</html>
`,
  MULTILINGUAL: `
<!DOCTYPE html>
<html>
<head>
    <title>Un moment...</title>
</head>
<body>
    <div>Por favor espere mientras verificamos</div>
    <div>Bitte warten Sie</div>
</body>
</html>
`,
  ACCESS_DENIED: `
<!DOCTYPE html>
<html>
<head>
    <title>Access denied</title>
</head>
<body>
    <div>Website is under attack mode</div>
    <div>You have been blocked by our security policy</div>
    <div>Cloudflare Ray ID: abc123def456</div>
</body>
</html>
`
};

export const GENERIC_PRODUCT_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Product</title>
</head>
<body>
    <div class="product-image">
        <img src="https://example.com/product.jpg" alt="Test Product">
    </div>
    
    <div class="manufacturer">Test Manufacturer</div>
    <div class="product-name">Test Product Name</div>
    <div class="scale-info">1/8 Scale</div>
</body>
</html>
`;