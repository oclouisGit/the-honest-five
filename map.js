import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/+esm";

const supabaseUrl =
  "https://ecsqqzuguvdrhlqsbjci.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc3FxenVndXZkcmhscXNiamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NDc2NjQsImV4cCI6MjA0NzEyMzY2NH0.GOWZP1KYpl_tAGjH2FL_16UPkkcpyQB17tWQnDbzBik";

// Verify Supabase client creation
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase client created successfully");
} catch (error) {
  console.error("Error creating Supabase client:", error);
}

var map = L.map("map").setView([40.736852, -73.98983], 13);

L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }
).addTo(map);

async function loadAllLocations() {
  const { data, error } = await supabase.from("restaurants")
    .select(`
            *,
            reviews (
                *
            )
        `);

  if (error) throw error;
  if (!data?.length) return null;

  return data;
}

async function displayLocations(restaurants) {
  console.log(restaurants);
  restaurants.forEach((restaurant) => {
    if (
      !restaurant.latitude ||
      !restaurant.longitude ||
      restaurant.reviews.length === 0
    )
      return;

    const ratings = restaurant.reviews
      .map((review) => `${review.rating}/10`)
      .join(", ");
    const ratingLabel =
      restaurant.reviews.length === 1
        ? "Rating: "
        : "Ratings: ";

    // Get summary from highest rated review
    const highestRatedReview = restaurant.reviews.reduce(
      (max, review) =>
        review.rating > max.rating ? review : max,
      restaurant.reviews[0]
    );

    const marker = L.marker([
      restaurant.latitude,
      restaurant.longitude,
    ])
      .bindPopup(
        `
            <div class="restaurant-popup">
                <div style="display: flex; align-items: stretch; gap: 16px;">
                    <div style="flex: 1;">
                        <h3><a href="/reviews.html#review-${
                          highestRatedReview.slug
                        }" style="text-decoration: none; color: inherit;">${
          restaurant.name
        }</a></h3>
                        <p>${ratingLabel}${ratings}</p>
                        <p>${
                          highestRatedReview?.summary || ""
                        }</p>
                    </div>
                    <img src="${
                      restaurant.cover_image
                    }" alt="${
          restaurant.name
        }" style="width: 120px; object-fit: cover;">
                </div>
            </div>
        `
      )
      .addTo(map);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadAllLocations()
    .then(displayLocations)
    .catch((error) => {
      console.error("Error loading locations:", error);
    });
});
