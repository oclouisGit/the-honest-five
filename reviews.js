import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/+esm';

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

async function fetchRecentReviews() {
    try {
        console.log("Attempting to fetch reviews...");
        
        // Verify the reviews container exists
        const container = document.getElementById('reviews-container');
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

    } catch (error) {
        console.error('Error in fetchRecentReviews:', error);
        const container = document.getElementById('reviews-container');
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

function displayReviews(reviews) {
    try {
        console.log("Starting to display reviews...");
        const reviewsContainer = document.getElementById('reviews-container');
        
        // Clear loading message
        reviewsContainer.innerHTML = '';

        reviews.forEach(review => {
            console.log('Processing review:', review);
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review');
            reviewElement.innerHTML = `
                <h1>${review.title || 'Untitled'}</h1>
                <p><strong>Date:</strong> ${review.publish_date ? new Date(review.publish_date).toLocaleDateString() : 'No date'}</p>
                <p>${review.summary || 'No summary available'}</p>
                <a href="review.html?id=${review.id}">Read More</a>
            `;
            reviewsContainer.appendChild(reviewElement);
        });
        
        console.log('Finished displaying reviews');
    } catch (error) {
        console.error('Error in displayReviews:', error);
        const container = document.getElementById('reviews-container');
        if (container) {
            container.innerHTML = `<p>Error displaying reviews: ${error.message}</p>`;
        }
    }
}

// Mappings for a more generic searchReviews function
const searchMappings = {
    rating: (term) => `rating.eq.${parseFloat(term)}`, // Adjusted for Supabase's logic tree format
    text: (term) => `title.ilike.%${term}%,summary.ilike.%${term}%`, // Combine title and summary
    category: (term) => `category.ilike.%${term}%`, // Cuisine
  };

  async function searchReviews(
    searchTerm = '',          // Default to an empty string
    category_ids = [],          // Default to an empty array
    location = null,          // Default to null
    ratingMin = 0,            // Default to 0
    ratingMax = 10            // Default to 10
    ) {    try {
        const container = document.getElementById('reviews-container');
        if (!container) {
        throw new Error('Reviews container not found in DOM');
        }

        // Show loading state
        container.innerHTML = '<p>Searching reviews...</p>';

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

        // Add location filter (if applicable)
        if (location) {
            query = query.eq('location', location); // Search by location
        }

        // Add rating range filter (if applicable)
        if (ratingMin !== 0 || ratingMax !== 10) {
            query = query.gte('rating', ratingMin).lte('rating', ratingMax); // Search by rating
        }

        // Perform the Supabase query
        const { data, error } = await query;


        if (error) {
        throw error;
        }

        if (!data || data.length === 0) {
        container.innerHTML = `<p>No reviews found matching "${searchTerm}".</p>`;
        return;
        }

        // Reuse existing display function
        displayReviews(data);

    } catch (error) {
        console.error('Error in searchReviews:', error);
        const container = document.getElementById('reviews-container');
        if (container) {
        container.innerHTML = `<p>Error searching reviews: ${error.message}</p>`;
        }
    }
}

// This stores the things about the query that we send to the backend to get the reviews
let category_ids = [];
let search_entry = '';
let location = null;
let ratingMax = 10;
let ratingMin = 0;

fetchRecentReviews();
fetchAndDisplayCategories();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initiating fetch...');

    // Get the reviews:

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
            searchReviews(search_entry, category_ids, location, ratingMin, ratingMax);
        }

    });

    // Add search event listener
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            search_entry = searchBar.value.trim();
            
            if (search_entry) {
                // Perform search
                searchReviews(search_entry, category_ids, location, ratingMin, ratingMax);
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
            searchReviews(search_entry, category_ids, location, ratingMin, ratingMax);
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
});

