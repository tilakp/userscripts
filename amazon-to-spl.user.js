// ==UserScript==
// @name         Amazon to Seattle Library Search
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add Seattle Public Library search link to Amazon book pages
// @author       You
// @match        https://www.amazon.com/*dp/*
// @match        https://www.amazon.com/*gp/product/*
// @match        https://www.amazon.com/*/dp/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to extract book title
    function getBookTitle() {
        // Try multiple selectors for title
        const titleSelectors = [
            '#productTitle',
            'span[id="productTitle"]',
            'h1.a-size-large'
        ];

        for (let selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                let title = element.textContent.trim();
                // If title contains ':', only use the part before it
                if (title.includes(':')) {
                    title = title.split(':')[0].trim();
                }
                return title;
            }
        }
        return null;
    }

    // Function to extract author name
    function getAuthorName() {
        // Try multiple selectors for author
        const authorSelectors = [
            '.author .a-link-normal',
            'a.contributorNameID',
            '.author a[href*="/e/"]',
            'span.author a'
        ];

        for (let selector of authorSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                // Clean up author name (remove "by" prefix if present)
                let authorText = element.textContent.trim();
                authorText = authorText.replace(/^by\s+/i, '');
                return authorText;
            }
        }
        return null;
    }

    // Function to create the library search link
    function createLibraryLink(title, author) {
        const query = `${title} ${author}`;
        const encodedQuery = encodeURIComponent(query);
        const libraryUrl = `https://seattle.bibliocommons.com/v2/search?query=${encodedQuery}&searchType=smart`;

        // Create the link container
        const linkContainer = document.createElement('div');
        linkContainer.style.cssText = `
            margin: 15px 0;
            padding: 12px;
            background-color: #f0f8ff;
            border: 2px solid #0066c0;
            border-radius: 8px;
            font-size: 14px;
        `;

        const link = document.createElement('a');
        link.href = libraryUrl;
        link.target = '_blank';
        link.textContent = '📚 Search this book at Seattle Public Library';
        link.style.cssText = `
            color: #0066c0;
            text-decoration: none;
            font-weight: bold;
            font-size: 16px;
        `;

        link.addEventListener('mouseenter', () => {
            link.style.textDecoration = 'underline';
        });

        link.addEventListener('mouseleave', () => {
            link.style.textDecoration = 'none';
        });

        linkContainer.appendChild(link);
        return linkContainer;
    }

    // Function to check if this is a book page
    function isBookPage() {
        // Check for book-specific indicators
        const indicators = [
            // Look for "Books" in breadcrumb or category
            document.querySelector('a[href*="/books/"]'),
            document.querySelector('a[href*="/Books/"]'),
            // Look for book-specific elements
            document.querySelector('.author'),
            document.querySelector('a.contributorNameID'),
            // Check if page content mentions book-related terms
            Array.from(document.querySelectorAll('#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li')).some(li => {
                const text = li.textContent.toLowerCase();
                return text.includes('publisher') || text.includes('isbn') || text.includes('paperback') || text.includes('hardcover');
            }),
            // Check product details section
            document.querySelector('[data-feature-name="bookDetails"]'),
            // Check for Kindle edition indicators
            document.querySelector('#formats') && document.querySelector('#formats').textContent.includes('Kindle')
        ];

        return indicators.some(indicator => indicator);
    }

    // Main function to add the library link
    function addLibraryLink() {
        // First check if this is actually a book page
        if (!isBookPage()) {
            console.log('Not a book page, skipping library link');
            return;
        }

        const title = getBookTitle();
        const author = getAuthorName();

        if (!title) {
            console.log('Could not find book title');
            return;
        }

        if (!author) {
            console.log('Could not find author name');
            return;
        }

        console.log('Found book:', title, 'by', author);

        // Find a good place to insert the link
        const insertLocations = [
            '#productTitle',
            '#title',
            '.product-title'
        ];

        for (let selector of insertLocations) {
            const insertPoint = document.querySelector(selector);
            if (insertPoint) {
                const libraryLink = createLibraryLink(title, author);
                insertPoint.parentNode.insertBefore(libraryLink, insertPoint.nextSibling);
                console.log('Seattle Library link added successfully!');
                break;
            }
        }
    }

    // Wait for page to load and add the link
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addLibraryLink);
    } else {
        // DOM already loaded
        addLibraryLink();
    }

    // Also observe for dynamic content changes (Amazon uses dynamic loading)
    const observer = new MutationObserver((mutations) => {
        if (document.querySelector('#productTitle') && !document.querySelector('a[href*="seattle.bibliocommons.com"]')) {
            addLibraryLink();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();