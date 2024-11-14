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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initiating fetch...');
    fetchRecentReviews();
});