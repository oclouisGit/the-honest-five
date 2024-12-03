import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/+esm';
import './dist/gauge.js';

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
    const { data, error } = await supabase.rpc('nearby_reviews', {
        lat: 40.807313,
        long: -73.946713,
      })
  
    if (error) throw error;
    return data;
}

async function fetchRecentReviews() {
    try {
        console.log("Attempting to fetch reviews...");
        
        // Verify the reviews container exists
        const container = document.getElementById('review-list-container');
        if (!container) {
            throw new Error('Reviews container not found in DOM');
        }

        // Add loading indicator
        container.innerHTML = '<p>Loading reviews...</p>';

        

        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('publish_date', { ascending: false })
            .limit(5);

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>No reviews found.</p>';
            return;
        }

        console.log('Retrieved reviews:', data);
        displayReviews(data);
        return data;

    } catch (error) {
        console.error('Error in fetchRecentReviews:', error);
        const container = document.getElementById('review-list-container');
        if (container) {
            container.innerHTML = `<p>Error loading reviews: ${error.message}</p>`;
        }
    }
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

        console.log('Retrieved categories:', data);

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



        console.log('Done with categories');

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
    angle: 0.18, // The span of the gauge arc
    lineWidth: 0.2, // The line thickness
    radiusScale: 0.8, // Relative radius
    pointer: {
      length: 0.48, //Relative to gauge radius
      strokeWidth: 0.045, // The thickness
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
        
        // Clear loading message
        reviewsContainer.innerHTML = '';

        reviews.forEach(review => {
            console.log('Processing review:', review);
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-card');

            const reviewSlug = review.slug;

            // Create plusses list
            const plussesList = review.plusses && review.plusses.length 
                ? `<div class="plusses">
                    <ul>${review.plusses.map(plus => `<p>${plus}</p>`).join('')}</ul>
                </div>`
                : '';

            // Create minuses list
            const minusesList = review.minuses && review.minuses.length 
                ? `<div class="minuses">
                    <ul>${review.minuses.map(minus => `<p>${minus}</p>`).join('')}</ul>
                </div>`
                : '';
            
            // I think this might need to be reserved for the full page article because its hard to fit this vertically while making sense
            // <div class="plus-and-minus-container"> 
            //     ${plussesList}
            //     ${minusesList}
            // </div>

            reviewElement.innerHTML = `
                <div class="review-card-body-container" data-review-slug="${reviewSlug}" data-review-id="${review.id}">
                    <div class="review-text-container"> 
                        <h1>${review.title || 'Untitled'}</h1>
                        <p><strong>Date:</strong> ${review.publish_date ? new Date(review.publish_date).toLocaleDateString() : 'No date'}</p>
                        <p>${review.summary || 'No summary available'}</p>
                    </div>

                    <div class="right-sidebar">
                        <div class="rating-number-container"> 
                            <h1 id=rating-number>${review.rating}/10</h1>
                        </div>
                        <div class="gauge-container"> 
                            <canvas id=gauge-${review.id}></canvas>
                        </div>
                        <div class="plus-and-minus-container"> 
                            ${plussesList}
                            ${minusesList}
                        </div>
                    </div>
                </div>
            `;

            // Add data attributes
            const reviewCardBodyContainer = reviewElement.querySelector('.review-card-body-container');
            reviewCardBodyContainer.dataset.reviewSlug = reviewSlug;
            reviewCardBodyContainer.dataset.reviewId = review.id;

            // Make the gauge for this review
            reviewsContainer.appendChild(reviewElement);
            var target = document.getElementById(`gauge-${review.id}`);
            var gauge = new Gauge(target).setOptions(opts);
            gauge.maxValue = 10;
            gauge.setMinValue(0); 
            gauge.set(review.rating);
            gauge.animationSpeed = 32;
        });

        // Use event delegation instead of multiple individual listeners
        reviewsContainer.addEventListener('click', (event) => {
            const reviewCard = event.target.closest('.review-card-body-container');
            if (reviewCard) {
                const reviewSlug = reviewCard.dataset.reviewSlug;
                const reviewId = reviewCard.dataset.reviewId;

                // Hide current view
                const reviewCardBodyContainer = document.getElementById("review-list-container");
                const filterHeader = document.querySelector(".filter-header");
                reviewCardBodyContainer.classList.add("hidden");
                filterHeader.classList.add("hidden");

                // Update URL only once
                history.pushState({ reviewSlug, reviewId }, '', `/reviews/${reviewSlug}`);

                console.log(`Navigating to review: ${reviewSlug}, ID: ${reviewId}`);

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

// Function to handle review navigation
function handleReviewNavigation() {
    const path = window.location.pathname;
    const match = path.match(/^\/reviews\/(.+)$/);

    if (match) {
        const reviewSlug = match[1];
        // Here you would typically fetch the full review details
        // For now, we'll just log the slug
        console.log(`Loaded review page for slug: ${reviewSlug}`);
        loadFullReview(reviewSlug);
    }
    const reviewListContainer = document.getElementById("review-list-container");
    const filterHeader = document.querySelector(".filter-header");

    // If not on a review page, show the reviews list
    if (!path.startsWith('/reviews/')) {
        // Ensure reviews list and filter header are visible
        reviewListContainer.classList.remove("hidden");
        filterHeader.classList.remove("hidden");
    }
}

async function loadFullReview(reviewSlug) {
    try {
        // Fetch full review details from Supabase
        const { data: review, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('slug', reviewSlug)
            .single();

        if (error) throw error

        // Render full review content
        renderFullReview(review)
    } catch (error) {
        console.error('Error loading review:', error)
        // Handle error (e.g., show error message)
    }
}

function renderFullReview(review) {
    // Create and populate full review view
    const fullReviewContainer = document.getElementById('full-review-container')
    fullReviewContainer.innerHTML = `
        <h1>${review.title}</h1>
        <p>${review.full_content}</p>
        <!-- Add more details as needed -->
    `
    // Show full review container, hide others
}

// Add event listener for browser back/forward navigation
window.addEventListener('popstate', handleReviewNavigation);


async function searchReviews(
    searchTerm = '',          // Default to an empty string
    category_ids = [],          // Default to an empty array
    user_latitude = null,          // Default to null
    user_longitude = null,          // Default to null
    ratingMin = 0,            // Default to 0
    ratingMax = 10            // Default to 10
    ) {    try {
        const container = document.getElementById('review-list-container');
        if (!container) {
        throw new Error('Reviews container not found in DOM');
        }

        // Show loading state
        container.innerHTML = '<p>Searching reviews...</p>';

        let reviewIds = null;

        // Step 1: Fetch location-based review IDs 
        if (user_latitude != null && user_longitude != null) {
            console.log('Fetching nearby reviews based on location...');
            const { data: locationData, error: locationError } = await supabase.rpc(
                'nearby_reviews',
                {
                    lat: user_latitude,
                    long: user_longitude,
                }
            );

            if (locationError) {
                console.error('Error fetching nearby reviews:', locationError);
                throw locationError;
            }

            if (locationData && locationData.length > 0) {
                // Extract the IDs of the reviews from the location-based data
                reviewIds = locationData.map((review) => review.id);
                console.log('Nearby review IDs:', reviewIds);
            } else {
                // If no nearby reviews are found, exit early
                container.innerHTML = `<p>No reviews found near your location.</p>`;
                return;
            }
        }

        // Start the query from 'reviews' table
        let query = supabase.from('reviews').select('*');

        // Add category filter (if applicable)
        if (category_ids.length > 0 && category_ids[0] !== '') {
            query = query.in('category_id', category_ids); // Use .in() to match categories
        }

        // Add search term filter (if applicable)
        if (searchTerm.trim() !== '') {
            query = query.or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);  // Search across title, summary, and content
        }

        // Add rating range filter (if applicable)
        if (ratingMin !== 0 || ratingMax !== 10) {
            query = query.gte('rating', ratingMin).lte('rating', ratingMax); // Search by rating
        }

        // Filter by review IDs (if location-based search was performed)
        if (reviewIds !== null) {
            query = query.in('id', reviewIds);
        }

        // Perform the Supabase query
        const { data, error } = await query;

        if (error) {
            console.error('Error fetching reviews:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `<p>No reviews found matching "${searchTerm}".</p>`;
            return;
        }

        // Update filter icon for mobile
        if (
            category_ids.length === 0 && // Check if category_ids is an empty array
            search_entry === '' && // Check if search_entry is an empty string
            user_latitude === null && // Check if user_latitude is null
            user_longitude === null && // Check if user_longitude is null
            ratingMax === 10 && // Check if ratingMax is 10
            ratingMin === 0 // Check if ratingMin is 0
        ) {
            outlinedFilterButton.classList.remove("hidden");
            filledFilterButton.classList.add("hidden");
        } else {
            outlinedFilterButton.classList.add("hidden");
            filledFilterButton.classList.remove("hidden");
        }

        // If location-based reviews were fetched, ensure they're in the original order
        // I don't know why I had to do this but nothing else I did could get this to do what I wanted
        if (reviewIds !== null && data) {
            const orderedData = reviewIds.map(id => data.find(review => review.id === id)).filter(review => review !== undefined);
            displayReviews(orderedData);
            return orderedData;
        } else {
            displayReviews(data);
            return data;
        }

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

let reviews_list = fetchRecentReviews();
fetchAndDisplayCategories();
// const nearbyReviews = await getNearestReviews(40.71863,-74.00611,);
// console.log('LOCATION SEARCH', nearbyReviews);

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    handleReviewNavigation();

    console.log('category_to_id_map:', category_to_id_map);
    console.log('category_ids:', category_ids);
    


    // What to call things
    const searchToggleButton = document.getElementById("search-toggle-button");
    const searchContainer = document.querySelector(".search-container");
    const searchBar = document.getElementById("search-bar");
    const clearSearchButton = document.getElementById("clear-search");
    const cuisineDropdownToggle = document.getElementById("cuisine-dropdown-toggle");
    const cuisineDropdownContent = document.getElementById("cuisine-dropdown-content");
    const cuisineDropdownButton = document.getElementById("cuisine-dropdown-button");



    // Clicking Cuisine filter should open the dropdown
    cuisineDropdownToggle.addEventListener("click", () => {
        cuisineDropdownContent.classList.remove("hidden");
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
        if (e.target !== cuisineDropdownContent && e.target !== cuisineDropdownToggle && e.target !== document.getElementById("cuisine-dropdown-button") && !cuisineDropdownContent.contains(e.target) && !cuisineDropdownContent.classList.contains("hidden") ) {
            cuisineDropdownContent.classList.add("hidden");
            searchReviews(search_entry, category_ids, user_latitude, user_longitude, ratingMin, ratingMax);
        }

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

