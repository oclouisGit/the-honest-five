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

async function fetchCategories() {
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
            const button = document.createElement('button');
            button.className = 'cuisine-dropdown-button';
            button.textContent = category.category; // Assuming "name" is the category's display name

            // Add an additional class for the last button
            if (index === data.length - 1) {
                button.classList.add('bottom-cuisine-button');
            }

            container.appendChild(button);

        });

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

async function searchReviews(searchTerm, searchType) {
    try {
        const container = document.getElementById('reviews-container');
        if (!container) {
        throw new Error('Reviews container not found in DOM');
        }

        // Show loading state
        container.innerHTML = '<p>Searching reviews...</p>';

        // Generate the query condition based on searchType
        const condition = searchMappings[searchType]
        ? searchMappings[searchType](searchTerm)
        : Object.values(searchMappings)
            .map((mapFunc) => mapFunc(searchTerm))
            .join(',');

        // Perform the search
        const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .or(condition)
        .order('publish_date', { ascending: false });

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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initiating fetch...');

    // Get the reviews:
    fetchRecentReviews();
    fetchCategories();

    // What to call things
    const searchToggleButton = document.getElementById("search-toggle-button");
    const searchContainer = document.querySelector(".search-container");
    const searchBar = document.getElementById("search-bar");
    const clearSearchButton = document.getElementById("clear-search");
    const cuisineDropdownToggle = document.getElementById("cuisine-dropdown-toggle");
    const cuisineDropdownContent = document.getElementById("cuisine-dropdown-content");

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
            fetchRecentReviews();
        }

        // Clicking off the dropdown menu should close it
        if (e.target !== cuisineDropdownContent && e.target !== cuisineDropdownToggle && e.target !== document.getElementById("cuisine-dropdown-button")){
            cuisineDropdownContent.classList.add("hidden");
        }
    });

    // Add search event listener
    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchBar.value.trim();
            
            if (searchTerm) {
                // Perform search
                searchReviews(searchTerm, 'text');
            } else {
                // If search is empty, revert to recent reviews
                fetchRecentReviews();
                searchContainer.classList.add('hidden');
                searchToggleButton.classList.remove('hidden');
            }
        }
    });
});

