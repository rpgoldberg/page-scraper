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