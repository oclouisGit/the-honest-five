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

var map = L.map('map').setView([40.736852, -73.98983], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

async function loadAllLocations() {
    const { data, error } = await supabase
            .from('reviews')
            .select('*');

    if (error) {
        throw error;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p>No reviews found.</p>';
        return;
    }

    // Group reviews by restaurant
    const groupedReviews = data.reduce((acc, review) => {
        if (!acc[review.title]) {
            acc[review.title] = [];
        }
        acc[review.title].push(review);
        return acc;
    }, {});

    return groupedReviews;
}

async function displayLocations(groupedReviews) {
    Object.keys(groupedReviews).forEach((restaurant) => {
        const reviews = groupedReviews[restaurant];
        const ratings = reviews.map(review => `${review.rating}/10`).join(', ');
        const ratingLabel = reviews.length === 1 ? 'Rating: ' : 'Ratings: ';
        const formattedTitle = reviews[0].title.replace(/ /g, '-');
 
        const marker = L.marker([reviews[0].latitude, reviews[0].longitude]).bindPopup(`
            <div class="restaurant-popup">
                <div style="display: flex; align-items: stretch; gap: 16px;">
                    <div style="flex: 1;">
                        <h3><a href="/reviews.html#review-${formattedTitle}" style="text-decoration: none; color: inherit;">${restaurant}</a></h3>
                        <p>${ratingLabel}${ratings}</p>
                        <p>${reviews[0].summary}</p>
                    </div>
                    <img src="${reviews[0].cover_image_url}" alt="${restaurant}" style="width: 120px; object-fit: cover;">
                </div>
            </div>
        `).addTo(map);
    });
 }


document.addEventListener('DOMContentLoaded', () => {
    loadAllLocations()
        .then(displayLocations)
        .catch((error) => {
            console.error('Error loading locations:', error);
        });
});