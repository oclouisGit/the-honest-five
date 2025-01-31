import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/+esm';
import './dist/gauge.js';

/*

<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Main H structure -->
  <path d="M40 30 L40 170" stroke="#4b3b2f" stroke-width="2"/>
  <path d="M90 30 L90 170" stroke="#4b3b2f" stroke-width="2"/>
  <!-- Center horizontal -->
  <path d="M40 100 L90 100" stroke="#4b3b2f" stroke-width="2"/>
  <!-- Extension lines -->
  <path d="M40 31 L60 31" stroke="#4b3b2f" stroke-width="2"/>
  <path d="M65 169 L90 169" stroke="#4b3b2f" stroke-width="2"/>
  <!-- Text -->
</svg>

TODO

Write a full review for the visuals
*/

const supabaseUrl = 'https://ecsqqzuguvdrhlqsbjci.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc3FxenVndXZkcmhscXNiamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NDc2NjQsImV4cCI6MjA0NzEyMzY2NH0.GOWZP1KYpl_tAGjH2FL_16UPkkcpyQB17tWQnDbzBik';

// Verify Supabase client creation
let supabase;
try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');
} catch (error) {
    console.error('Error creating Supabase client:', error);
}

// Function to query nearest reviews
async function getNearestReviews(latitude, longitude) {
    const { data, error } = await supabase.rpc('nearby_restaurants', {
        lat: latitude,
        long: longitude,
    });

    if (error) throw error;
    return data;
}

async function fetchRecentReviews() {
    try {
        console.log("Attempting to fetch reviews...");
        
        const container = document.getElementById('review-list-container');
        if (!container) {
            throw new Error('Reviews container not found in DOM');
        }

        container.innerHTML = createLoadingReviews(5);

        // First get the reviews with restaurant info
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                restaurants!restaurant_id (
                    id,
                    cover_image,
                    latitude,
                    longitude,
                    name,
                    category_id
                )
            `)
            .order('publish_date', { ascending: false })
            .limit(5);

        if (error) throw error;

        // Then get the profiles for these authors
        const { data: profiles, profilesError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', reviews.map(review => review.author));

        if (profilesError) throw profilesError;

        // Create a map of author IDs to display names
        const authorMap = new Map(profiles.map(profile => [profile.id, profile.display_name]));

        // Add display names to reviews
        const reviewsWithDisplayNames = reviews.map(review => ({
            ...review,
            authorDisplayName: authorMap.get(review.author) || 'Anonymous'
        }));

        displayReviews(reviewsWithDisplayNames);
        return reviewsWithDisplayNames;

    } catch (error) {
        console.error('Error in fetchRecentReviews:', error);
        const container = document.getElementById('review-list-container');
        if (container) {
            container.innerHTML = `<p>Error loading reviews: ${error.message}</p>`;
        }
    }
}

function createLoadingReviews(count) {
    const loadingHTML = `
        <div class="review-card loading">

        </div>
    `;

    return Array(count).fill(loadingHTML).join('');
}

let category_to_id_map = {};

async function fetchAndDisplayCategories() {
    try {
        console.log("Attempting to fetch categories...");
        
        // Verify the reviews container exists
        const container = document.getElementById('cuisine-dropdown-content');
        if (!container) {
            throw new Error('cuisine-dropdown-content not found in DOM');
        }

        const { data, error } = await supabase
            .from('categories')
            .select('*');

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>No categories found.</p>';
            return;
        }

        // console.log('Retrieved categories:', data);
        console.log('Retrieved categories');

        // Display the categories
        data.forEach((category, index) => {
            category_to_id_map[category.category] = category.id;
            const button = document.createElement('button');
            button.className = 'cuisine-dropdown-button';
            button.textContent = category.category; // Assuming "name" is the category's display name

            // Add an additional class for the last button
            if (index === data.length - 1) {
                button.classList.add('bottom-cuisine-button');
            }

            container.appendChild(button);
            // Clicking on a cuisine or category should add that category_id to category_ids
            button.addEventListener("click", (e) =>{
                const category_id = category_to_id_map[e.target.textContent];
                if (!category_ids.includes(category_id)) {
                    category_ids.push(category_id);  // Use push to add to array
                    e.target.classList.add("selected")
                    console.log(`Category ID ${category_id} added.`, category_ids);
                } else {
                    const index = category_ids.indexOf(category_id);
                    if (index > -1) {
                        category_ids.splice(index, 1);  // Use splice to remove from array
                        console.log(`Category ID ${category_id} removed.`, category_ids);
                        e.target.classList.remove("selected")
                    }
                }
                document.getElementById("cuisine-dropdown-toggle").textContent = `Cuisine (${category_ids.length})`;
                if(category_ids.length == 0){
                    document.getElementById("cuisine-dropdown-toggle").textContent = 'Cuisine';
                }

            });
        });



        // console.log('Done with categories');

    } catch (error) {
        console.error('Error in fetchCategories:', error);
        const container = document.getElementById('cuisine-dropdown-content');
        if (container) {
            container.innerHTML = `<p>Error loading categories: ${error.message}</p>`;
        }
    }
}

// Customization for the Gauges made for each review
let opts = {
    angle: 0.15, // The span of the gauge arc
    lineWidth: 0.3, // The line thickness
    radiusScale: 1, // Relative radius
    radius: 10,
    pointer: {
      length: 0.48, //Relative to gauge radius
      strokeWidth: 0.1, // The thickness
      color: '#4b3b2f' // Fill color
    },
    limitMax: false,     // If false, max value increases automatically if value > maxValue
    limitMin: false,     // If true, the min value of the gauge will be fixed
    percentColors: [[0.0, "#ff0000" ], [0.50, "#ffff00"], [1.0, "#00ff00"]],
    highDpiSupport: true,     // High resolution support
};


function displayReviews(reviews) {
    try {
        console.log("Starting to display reviews...");
        const reviewsContainer = document.getElementById('review-list-container');
        reviewsContainer.innerHTML = '';

        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-card');

            const reviewSlug = review.slug;
            const restaurant = review.restaurants;
            console.log(review.restaurants);
            
            reviewElement.innerHTML = `
                <div class="review-card-body-container" data-review-slug="${reviewSlug}" data-review-id="${review.id}" data-review-author="${review.authorDisplayName}">
                    <div class="review-cover-image"> 
                        <img src=${review.cover_image || 'No image available'}>
                    </div>
                    <div class="non-image-review-container"> 
                        <div class="review-text-container"> 
                            <h1>${restaurant.name || 'Untitled'}</h1>
                            <p><strong>Reviewer:</strong> ${review.authorDisplayName}</p>
                            <p>${review.summary || 'No summary available'}</p>
                        </div>

                        <div class="right-sidebar">
                            <div class="gauge-container"> 
                                <canvas id=gauge-${review.id}></canvas>
                            </div>
                            <div class="rating-number-container"> 
                                <h1 id=rating-number>${review.rating}/10</h1>
                            </div>
                            <div class="cuisine-label-container"> 
                                <h1 id=cuisine-label>${getCategoryById(category_to_id_map, restaurant.category_id)}</h1>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const reviewCardBodyContainer = reviewElement.querySelector('.review-card-body-container');
            reviewCardBodyContainer.dataset.reviewSlug = reviewSlug;
            reviewCardBodyContainer.dataset.reviewId = review.id;

            reviewsContainer.appendChild(reviewElement);
            var target = document.getElementById(`gauge-${review.id}`);
            var gauge = new Gauge(target).setOptions(opts);
            gauge.maxValue = 10;
            gauge.setMinValue(0); 
            gauge.set(review.rating);
            gauge.animationSpeed = 32;
        });

        reviewsContainer.addEventListener('click', (event) => {
            const reviewCard = event.target.closest('.review-card-body-container');
            if (reviewCard) {
                const reviewSlug = reviewCard.dataset.reviewSlug;
                
                // Remove this line since we don't need to append the author anymore
                // const authorDisplayName = reviewCard.dataset.reviewAuthor;
                // const authorSlug = authorDisplayName.toLowerCase().replace(/\s+/g, '-');
                
                const reviewCardBodyContainer = document.getElementById("review-list-container");
                const filterHeader = document.querySelector(".filter-header");
                reviewCardBodyContainer.classList.add("hidden");
                filterHeader.classList.add("hidden");
            
                // Just use the slug as-is since it already includes the author
                window.location.hash = `review-${reviewSlug}`;
            
                handleReviewNavigation();
            }
        });

        console.log('Finished displaying reviews');
    } catch (error) {
        console.error('Error in displayReviews:', error);
        const container = document.getElementById('review-list-container');
        if (container) {
            container.innerHTML = `<p>Error displaying reviews: ${error.message}</p>`;
        }
    }
}



function getCategoryById(categoryToIdMap, targetId) {
    // Find the first entry where the value (UUID) matches the target ID
    const entry = Object.entries(categoryToIdMap).find(([category, id]) => id === targetId);
    return entry ? entry[0] : null;
}

function handleReviewNavigation() {
    const hash = window.location.hash;
    const reviewListContainer = document.getElementById("review-list-container");
    const filterHeader = document.querySelector(".filter-header");
    const fullReviewContainer = document.getElementById('full-review-container');

    if (hash && hash.startsWith('#review-')) {
        // Hide list view and filter immediately
        reviewListContainer.classList.add("hidden");
        filterHeader.classList.add("hidden");
        outlinedFilterButton.classList.add("hidden");
        filledFilterButton.classList.add("hidden");
        fullReviewContainer.classList.remove("hidden");

        // Remove the #review- prefix to get the full slug
        const reviewSlug = hash.replace('#review-', '');
        // The author name is already part of the slug, so we can extract it
        const authorSlugPart = reviewSlug.split('--')[1];
        const reviewAuthor = authorSlugPart ? authorSlugPart : '';

        console.log('Slug passed to API:', reviewSlug);
        loadFullReview(reviewSlug, reviewAuthor);
    } else {
        reviewListContainer.classList.remove("hidden");
        filterHeader.classList.remove("hidden");
        fullReviewContainer.classList.add("hidden");
        outlinedFilterButton.classList.remove("hidden");
    }
}



async function loadFullReview(reviewSlug, reviewAuthorDisplayName = null) {
    try {
        const { data: initialReviews, error: initialError } = await supabase
            .from('reviews')
            .select('restaurant_id, author')
            .eq('slug', reviewSlug);  // Removed .single()

        if (initialError) throw initialError;
        if (!initialReviews || initialReviews.length === 0) {
            throw new Error('Review not found');
        }

        // Take the first matching review
        const initialReview = initialReviews[0];

        // Then get all reviews for this restaurant
        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
                *,
                restaurants!reviews_restaurant_id_fkey (
                    *
                )
            `)
            .eq('restaurant_id', initialReview.restaurant_id);

        if (reviewsError) throw reviewsError;
        
        // Get profiles for all authors
        const { data: profiles, profilesError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', reviews.map(review => review.author));

        if (profilesError) throw profilesError;

        // Create a map of author IDs to display names
        const authorMap = new Map(profiles.map(profile => [profile.id, profile.display_name]));

        // Add display names to reviews
        const reviewsWithDisplayNames = reviews.map(review => ({
            ...review,
            authorDisplayName: authorMap.get(review.author) || 'Anonymous'
        }));

        // Get sections for all reviews
        const reviewIds = reviewsWithDisplayNames.map(review => review.id);
        const { data: sections, error: sectionsError } = await supabase
            .from('sections')
            .select('*')
            .in('review_id', reviewIds)
            .order('order', { ascending: true });

        if (sectionsError) throw sectionsError;

        const sectionsByReview = sections.reduce((acc, section) => {
            if (!acc[section.review_id]) {
                acc[section.review_id] = [];
            }
            acc[section.review_id].push(section);
            return acc;
        }, {});

        let initialReviewId;
        if (reviewAuthorDisplayName) {
            const authorReview = reviewsWithDisplayNames.find(review => 
                review.authorDisplayName.toLowerCase() === reviewAuthorDisplayName.replace(/-/g, ' ').toLowerCase()
            );
            initialReviewId = authorReview ? authorReview.id : reviewsWithDisplayNames[0].id;
        } else {
            initialReviewId = reviewsWithDisplayNames[0].id;
        }

        renderFullReview(reviewsWithDisplayNames, sectionsByReview, initialReviewId);

        if (!reviewAuthorDisplayName) {
            const activeReview = reviewsWithDisplayNames.find(review => review.id === initialReviewId);
            const authorSlug = activeReview.authorDisplayName.replace(/\s+/g, '-').toLowerCase();
            window.location.hash = `review-${reviewSlug}--${authorSlug}`;
        }

    } catch (error) {
        console.error('Error loading review:', error);
        const fullReviewContainer = document.getElementById('full-review-container');
        if (fullReviewContainer) {
            fullReviewContainer.innerHTML = `<p>Error loading review: ${error.message}</p>`;
        }
    }
}

function renderFullReview(reviews, sectionsByReview, initialReviewId) {
    const fullReviewContainer = document.getElementById('full-review-container');
    if (!fullReviewContainer) return;

    // Group reviews by restaurant_id
    const restaurantId = reviews[0].restaurant_id;
    const relatedReviews = reviews.filter(review => review.restaurant_id === restaurantId);
    const hasMultipleReviews = relatedReviews.length > 1;
    const gauges = {};
    // let reviewHTML = `
    // <h1 class="article-title">${reviews[0].restaurants?.name || reviews[0].title}</h1>
    // <h3 class="article-address">${reviews[0].restaurants?.address || ''}</h3>

    // <div class="full-review-cover-image"> 
    //     <img src="${reviews[0].restaurants?.cover_image || 'No image available'}" alt="${reviews[0].restaurants?.name || reviews[0].title}">
    // </div>

    // <div id="review-map" class="review-map" ></div>

    // `;
    let reviewHTML = `
        <h1 class="article-title">${reviews[0].restaurants?.name || reviews[0].title}</h1>
        <h3 class="article-address">${reviews[0].restaurants?.address || ''}</h3>

        <div id="review-map" class="review-map" ></div>

        `;

        if (hasMultipleReviews) {
            reviewHTML += `
            <div class="tab-container" id="reviewTabs">
                ${reviews.map((review) => `
                    <button class="tab ${review.id === initialReviewId ? 'active' : ''}" 
                            data-review-id="${review.id}"
                            data-author="${review.authorDisplayName}">
                        <div class="tab-gauge-container">
                            <canvas id="tab-gauge-${review.id}"></canvas>
                            <div class="tab-rating">${review.rating}/10</div>
                        </div>
                        <div class="tab-author">${review.authorDisplayName}</div>
                    </button>
                `).join('')}
            </div>`;
        

            // Create container for all review contents
            reviewHTML += `<div id="reviewContents">`;

            // Add each review's content (initially hidden except for active one)
            reviews.forEach(review => {
                const sections = sectionsByReview[review.id] || [];
                const isActive = review.id === initialReviewId;
                
                reviewHTML += `
                    <div class="review-content ${isActive ? 'active' : 'hidden'}" 
                        data-review-id="${review.id}">
                        <div class="full-review-cover-image"> 
                            <img src="${review.cover_image || 'No image available'}" alt="${review.title}">
                        </div>
                        <div class="gauge-card-container">
                            <p class="multiple-full-review-summary">${review.summary}</p>
                        </div>


                        <div class="review-sections">
                            ${renderSections(sections)}
                        </div>
                    </div>`;
            });
        } else {
            // Create container for all review contents
            reviewHTML += `<div id="reviewContents">`;
            
            // Add each review's content (initially hidden except for active one)
            reviews.forEach(review => {
                const sections = sectionsByReview[review.id] || [];
                const isActive = review.id === initialReviewId;
                
                reviewHTML += `
                    <div class="review-content ${isActive ? 'active' : 'hidden'}" 
                        data-review-id="${review.id}">
                        <div class="gauge-card-container">
                            <div class="full-review-gauge-container"> 
                                <canvas id="full-review-gauge-${review.id}"></canvas>
                            </div>
                            <div class="rating-number-container"> 
                                <h1 id="rating-number">${review.rating}/10</h1>
                            </div>
                            <div class="cuisine-label-container"> 
                                <h1 id="cuisine-label">${getCategoryById(category_to_id_map, reviews[0].restaurants?.category_id.toString())}</h1>
                            </div>
                            <p class="full-review-summary">${review.summary}</p>
                        </div>

                        <hr class="review-divider">

                        <div class="review-sections">
                            ${renderSections(sections)}
                        </div>
                    </div>`;
            });
        }
    reviewHTML += '</div>'; 
    // reviewHTML += '<div class="review-sections"><h1 class="section-heading">Map</h1><div id="review-map" class="review-map" ></div></div></div>'; 
    
    fullReviewContainer.innerHTML = reviewHTML;

    // After setting innerHTML, initialize gauges once and store them
    if (hasMultipleReviews) {
        // Initialize tab gauges only
        reviews.forEach(review => {
            const tabTarget = document.getElementById(`tab-gauge-${review.id}`);
            if (tabTarget && !gauges[`tab-${review.id}`]) {
                const tabGauge = new Gauge(tabTarget).setOptions({
                    ...opts,
                    radiusScale: 0.8,
                    lineWidth: 0.2,
                    pointer: {
                        length: 0.5,
                        strokeWidth: 0.08,
                        color: '#4b3b2f'
                    }
                });
                tabGauge.maxValue = 10;
                tabGauge.setMinValue(0);
                tabGauge.set(review.rating);
                gauges[`tab-${review.id}`] = tabGauge;
            }
        });
    } else {
        // Initialize single review gauge
        reviews.forEach(review => {
            const contentTarget = document.getElementById(`full-review-gauge-${review.id}`);
            if (contentTarget && !gauges[`content-${review.id}`]) {
                const contentGauge = new Gauge(contentTarget).setOptions(opts);
                contentGauge.maxValue = 10;
                contentGauge.setMinValue(0);
                contentGauge.set(review.rating);
                gauges[`content-${review.id}`] = contentGauge;
            }
        });
    }

    if (hasMultipleReviews) {
        const tabContainer = document.getElementById('reviewTabs');
        if (tabContainer) {
            tabContainer.addEventListener('click', (e) => {
                const tab = e.target.closest('.tab');
                if (!tab) return;
    
                // Update active tab
                document.querySelectorAll('.tab').forEach(t => 
                    t.classList.remove('active'));
                tab.classList.add('active');
    
                // Update visible content without touching gauges
                const reviewId = tab.dataset.reviewId;
                const clickedReview = reviews.find(review => review.id === reviewId);
                
                document.querySelectorAll('.review-content').forEach(content => {
                    if (content.dataset.reviewId === reviewId) {
                        content.classList.remove('hidden');
                        content.classList.add('active');
                    } else {
                        content.classList.add('hidden');
                        content.classList.remove('active');
                    }
                });
    
                // Update URL using pushState
                if (clickedReview) {
                    const newUrl = `#review-${clickedReview.slug}`;
                    history.pushState(null, '', newUrl);
                }
            });
        }
    }

    var map = L.map('review-map').setView([reviews[0].restaurants.latitude,reviews[0].restaurants.longitude], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    fullReviewContainer.classList.remove('hidden');

    if (!reviews[0].restaurants.latitude || !reviews[0].restaurants.longitude) return;
    
    const marker = L.marker([reviews[0].restaurants.latitude, reviews[0].restaurants.longitude]).bindPopup(`
        <div class="restaurant-popup">
            <div style="display: flex; align-items: stretch; gap: 16px;">
                <div style="flex: 1;">
                    <h3>${reviews[0].restaurants.name}</h3>

                </div>
            </div>
        </div>
    `).addTo(map);
}

// Helper function to render sections
function renderSections(sections) {
    return sections.map(section => {
        let sectionHTML = '';
        
        // Handle the heading if present
        if (section.heading) {
            sectionHTML += `<h2 class="section-heading">${section.heading}</h2>`;
        }

        // Handle sections with both image and text
        if (section.image_url && section.text) {
            sectionHTML += `
                <div class="section-with-image-container">
                    <img src="${section.image_url}" alt="${section.heading || 'Review section image'}" class="section-with-image-image">
                    <div class="section-text">${section.text}</div>
                </div>`;
        } 
        // Handle image-only sections
        else if (section.image_url) {
            sectionHTML += `
                <div class="image-section-container">
                    <img src="${section.image_url}" alt="${section.heading || 'Review section image'}" class="image-section-image">
                </div>`;
        } 
        // Handle text-only sections
        else if (section.text) {
            // Check if the text contains HTML
            if (section.text.includes('<p>') || section.text.includes('</p>')) {
                // If it contains HTML, wrap it in a div with the text-section-text class
                sectionHTML += `<div class="text-section-text">${section.text}</div>`;
            } else {
                // If it's plain text, wrap it in a p tag
                sectionHTML += `<p class="text-section-text">${section.text}</p>`;
            }
        }
        
        return sectionHTML;
    }).join('');
}

// Function to handle gauge initialization
function initializeGauge(review) {
    // Wait briefly to ensure DOM is ready
    setTimeout(() => {
        const target = document.getElementById(`full-review-gauge-${review.id}`);
        if (target) {
            target.classList.remove('hidden');
            const gauge = new Gauge(target).setOptions(opts);
            gauge.maxValue = 10;
            gauge.setMinValue(0); 
            gauge.set(review.rating);
            gauge.animationSpeed = 32;
        }
    }, 0);
}


// Add event listener for browser back/forward navigation
window.addEventListener('popstate', handleReviewNavigation);


const arraysHaveSameContents = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    const set1 = new Set(arr1);
    return arr2.every(item => set1.has(item));
};

async function searchReviews(
    searchTerm = '',
    category_ids = [],
    user_latitude = null,
    user_longitude = null,
    ratingMin = 0,
    ratingMax = 10
) {    
    try {
        const container = document.getElementById('review-list-container');
        if (!container) {
            throw new Error('Reviews container not found in DOM');
        }

        container.innerHTML = '<p>Searching reviews...</p>';

        // Start with base query
        let query = supabase
            .from('reviews')
            .select(`
                *,
                restaurants (
                    id,
                    cover_image,
                    latitude,
                    longitude,
                    name,
                    category_id
                )
            `);

        // Add rating range filter if specified
        if (ratingMin !== 0 || ratingMax !== 10) {
            query = query.gte('rating', ratingMin).lte('rating', ratingMax);
        }

        // If we have a location search, get the restaurant IDs first
        if (user_latitude !== null && user_longitude !== null) {
            const { data: nearbyRestaurants, error: locationError } = await supabase.rpc(
                'nearby_restaurants',
                {
                    search_lat: user_latitude,
                    search_lng: user_longitude,
                    radius_meters: 5000,
                    max_results: 20
                }
            );

            if (locationError) throw locationError;

            if (nearbyRestaurants && nearbyRestaurants.length > 0) {
                const restaurantIds = nearbyRestaurants.map(r => r.id);
                query = query.in('restaurant_id', restaurantIds);
            } else {
                container.innerHTML = '<p>No restaurants found in your area.</p>';
                return;
            }
        }

        // Execute the query
        const { data: reviews, error } = await query;
        if (error) throw error;

        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<p>No reviews found.</p>';
            return;
        }

        // Get author display names
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', reviews.map(review => review.author));

        if (profilesError) throw profilesError;
        const authorMap = new Map(profiles.map(profile => [profile.id, profile.display_name]));

        // Post-process the results in JavaScript
        console.log('Category IDs for filtering:', category_ids);
        console.log('Total reviews before filtering:', reviews.length);
        let filteredReviews = reviews.filter(review => {
            // Add author display names
            review.authorDisplayName = authorMap.get(review.author) || 'Anonymous';

            // Apply category filter if needed
            if (category_ids.length > 0) {
                if (!review.restaurants) return false;
                const restaurantCategoryId = review.restaurants.category_id;
                // Convert both to strings for comparison
                const matches = category_ids.some(id => id.toString() === restaurantCategoryId.toString());
                if (!matches) return false;
            }

            // Apply text search if needed
            if (searchTerm && searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase();
                const matchesSummary = review.summary && review.summary.toLowerCase().includes(term);
                const matchesRestaurantName = review.restaurants && 
                                            review.restaurants.name && 
                                            review.restaurants.name.toLowerCase().includes(term);
                if (!matchesSummary && !matchesRestaurantName) {
                    return false;
                }
            }

            return true;
        });

        // Update filter icon for mobile
        if (
            category_ids.length === 0 &&
            searchTerm === '' &&
            user_latitude === null &&
            user_longitude === null &&
            ratingMax === 10 &&
            ratingMin === 0
        ) {
            outlinedFilterButton.classList.remove("hidden");
            filledFilterButton.classList.add("hidden");
        } else {
            outlinedFilterButton.classList.add("hidden");
            filledFilterButton.classList.remove("hidden");
        }

        // Update previous values
        previous_category_ids = [...category_ids];
        previous_search_entry = searchTerm;
        previous_user_latitude = user_latitude;
        previous_user_longitude = user_longitude;
        previous_ratingMax = ratingMax;
        previous_ratingMin = ratingMin;

        if (filteredReviews.length === 0) {
            container.innerHTML = '<p>No reviews found matching your criteria.</p>';
            return;
        }

        displayReviews(filteredReviews);
        return filteredReviews;

    } catch (error) {
        console.error('Error in searchReviews:', error);
        const container = document.getElementById('review-list-container');
        if (container) {
            container.innerHTML = `<p>Error searching reviews: ${error.message}</p>`;
        }
    }
}






// This stores the things about the query that we send to the backend to get the reviews
let category_ids = [];
let search_entry = '';
let user_latitude = null;
let user_longitude = null;
let ratingMax = 10;
let ratingMin = 0;
let previous_category_ids = [];
let previous_search_entry = '';
let previous_user_latitude = null;
let previous_user_longitude = null;
let previous_ratingMax = 10;
let previous_ratingMin = 0;

let reviews_list = fetchRecentReviews();
fetchAndDisplayCategories();
// const nearbyReviews = await getNearestReviews(40.71863,-74.00611,);
// console.log('LOCATION SEARCH', nearbyReviews);

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    handleReviewNavigation();


    // console.log('category_to_id_map:', category_to_id_map);
    // console.log('category_ids:', category_ids);
    


    // What to call things
    const searchToggleButton = document.getElementById("search-toggle-button");
    const searchContainer = document.querySelector(".search-container");
    const searchBar = document.getElementById("search-bar");
    const clearSearchButton = document.getElementById("clear-search");
    const cuisineDropdownToggle = document.getElementById("cuisine-dropdown-toggle");
    const cuisineDropdownContent = document.getElementById("cuisine-dropdown-content");
    const cuisineDropdownButton = document.getElementById("cuisine-dropdown-button");


    // Clicking Cuisine filter should toggle the dropdown
    cuisineDropdownToggle.addEventListener("click", () => {
        if (cuisineDropdownContent.classList.contains("hidden")) {
            cuisineDropdownContent.classList.remove("hidden");
        } else {
            cuisineDropdownContent.classList.add("hidden");
            searchReviews(search_entry, category_ids, user_latitude, user_longitude, ratingMin, ratingMax);
        }
    });

    // Clicking on the search button shows the search button
    searchToggleButton.addEventListener("click", () => {
        searchContainer.classList.remove("hidden");
        searchToggleButton.classList.add("hidden");
        searchBar.focus(); // Automatically focus the input field
    });

    // Clear the search bar when the clear button is clicked
    clearSearchButton.addEventListener("click", () => {
        searchBar.value = ""; // Clear the text
        searchContainer.classList.add("hidden");
        searchToggleButton.classList.remove("hidden");
        fetchRecentReviews();
    });

    // Pressing enter on a search bar with nothing should close it
    searchBar.addEventListener("keypress", (e) => {
        if(e.key === "Enter" && searchBar.value.trim() === ""){
            searchContainer.classList.add("hidden");
            searchToggleButton.classList.remove("hidden");
        }
    });

    document.addEventListener("click", (e) => {
        // Clicking off the search bar, if its empty, will close it
        if (e.target !== searchBar && e.target !== searchToggleButton  && searchBar.value.trim() === "" && !searchContainer.classList.contains("hidden")){
            searchContainer.classList.add("hidden");
            searchToggleButton.classList.remove("hidden");
        }

    // Clicking off the dropdown menu should close it, but not when clicking a button inside the dropdown
    document.addEventListener("click", (e) => {
        if (e.target !== cuisineDropdownContent && 
            e.target !== cuisineDropdownToggle && 
            e.target !== document.getElementById("cuisine-dropdown-button") && 
            !cuisineDropdownContent.contains(e.target) && 
            !cuisineDropdownContent.classList.contains("hidden")) {
            cuisineDropdownContent.classList.add("hidden");
            searchReviews(search_entry, category_ids, user_latitude, user_longitude, ratingMin, ratingMax);
        }
    });

    });

    // Add search event listener
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            search_entry = searchBar.value.trim();
            
            if (search_entry) {
                // Perform search
                searchReviews(search_entry, category_ids, user_latitude, user_longitude, ratingMin, ratingMax);
            } else {
                // If search is empty, revert to recent reviews
                fetchRecentReviews();
                searchContainer.classList.add('hidden');
                searchToggleButton.classList.remove('hidden');
            }
        }
    });

    // Slider Handling
    const minRange = document.getElementById('min-range');
    const maxRange = document.getElementById('max-range');
    const minValue = document.getElementById('min-value');
    const maxValue = document.getElementById('max-value');
    
    const ratingButton = document.getElementById("rating-button");
    const ratingsSliderContainer = document.querySelector(".ratings-slider-container"); 
    const ratingsSlider = document.querySelector(".ratings-slider-track"); 

    // Pressing on rating should show the slider
    ratingButton.addEventListener("click", (e) => {
        ratingButton.classList.add("hidden");
        ratingsSliderContainer.classList.remove("hidden");
    });

    // Selecting a rating should update the value
    document.addEventListener("click", (e) => {
        // Clicking off the ratings should close it
        ratingMax = parseFloat(maxRange.value);
        ratingMin = parseFloat(minRange.value);
        if(e.target !== ratingsSliderContainer && e.target !== ratingButton && !ratingsSliderContainer.contains(e.target) && !ratingsSliderContainer.classList.contains("hidden")){
            ratingButton.classList.remove("hidden");
            ratingsSliderContainer.classList.add("hidden");
            if(ratingMax == ratingMin){
                ratingButton.textContent = `Rating (${ratingMin})`;
            } if(ratingMax == 10 && ratingMin == 0){
                ratingButton.textContent = `Rating`;
            } else {
                ratingButton.textContent = `Rating (${ratingMin}-${ratingMax})`;
            }
            searchReviews(search_entry, category_ids, user_latitude, user_longitude, ratingMin, ratingMax);
        }
        
    });

    minRange.addEventListener('input', (e) => {
        let minVal = parseFloat(e.target.value);
        let maxVal = parseFloat(maxRange.value);
        
        if (minVal > maxVal) {
            minVal = maxVal;
            minRange.value = minVal;
        }
        
        minValue.textContent = minVal.toFixed(1);
    });

    maxRange.addEventListener('input', (e) => {
        let maxVal = parseFloat(e.target.value);
        let minVal = parseFloat(minRange.value);
        
        if (maxVal < minVal) {
            maxVal = minVal;
            maxRange.value = maxVal;
        }
        
        maxValue.textContent = maxVal.toFixed(1);
    });
    
    // Location button handling
    const getLocationButton = document.getElementById("get-location-button");

    getLocationButton.addEventListener('click', () => {
        // If the use has no location status yet
        // Get location from browser and update button to reflect that if it was successful
        if(user_latitude === null && user_longitude === null){
            getLocationButton.style.outline = '1px solid #f8f8f8';
            getLocationButton.style.outlineOffset = '-4px';
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        user_latitude = position.coords.latitude;
                        user_longitude = position.coords.longitude;
                        searchReviews(search_entry, category_ids, user_latitude, user_longitude, ratingMin, ratingMax);
                        console.log(`Latitude: ${user_latitude}, Longitude: ${user_longitude}`);
                    },
                    (error) => {
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                display.textContent = "User denied the request for Geolocation.";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                display.textContent = "Location information is unavailable.";
                                break;
                            case error.TIMEOUT:
                                display.textContent = "The request to get user location timed out.";
                                break;
                            case error.UNKNOWN_ERROR:
                                display.textContent = "An unknown error occurred.";
                                break;
                        }
                    }
                );
            } else {
                display.textContent = "Geolocation is not supported by this browser.";
            }
        } else {
            user_latitude = null;
            user_longitude = null;
            getLocationButton.style.outline = 'none';
            getLocationButton.style.outlineOffset = '0px';
            searchReviews(search_entry, category_ids, user_latitude, user_longitude, ratingMin, ratingMax);
        }
        

    });

});


// What to call things
const filledFilterButton = document.getElementById("filled-icon-button");
const outlinedFilterButton = document.getElementById("outlined-icon-button");
const filterButtonContainer = document.querySelector(".filter-button-container"); 
const filterHeader = document.querySelector(".filter-header"); 



// Clicking outlined filter button
outlinedFilterButton.addEventListener("click", () => {
    // If the menu is closed, open it
    // Toggle filter header visibility
    if (filterHeader.style.display === "none" || filterHeader.style.display === "") {
        filterHeader.style.display = "flex";  // Show the filter header
    } else {
        filterHeader.style.display = "none";  // Hide the filter header
    }
});

// Clicking filled filter button should close the filter
filledFilterButton.addEventListener("click", () => {
    // Toggle filter header visibility
    if (filterHeader.style.display === "none" || filterHeader.style.display === "") {
        filterHeader.style.display = "flex";  // Show the filter header
    } else {
        filterHeader.style.display = "none";  // Hide the filter header
    }
});