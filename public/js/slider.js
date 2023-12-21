// Selecting DOM elements
let slider = document.querySelector('.slider .list');
let items = document.querySelectorAll('.slider .list .item');
let next = document.getElementById('next');
let prev = document.getElementById('prev');
let dots = document.querySelectorAll('.slider .dots li');

// Setting up initial variables
let lengthItems = items.length - 1;
let active = 0;

// Event handler for the "Next" button
next.onclick = function(){
    // Increment active index or reset to 0 if at the end
    active = active + 1 <= lengthItems ? active + 1 : 0;
    // Reload the slider
    reloadSlider();
}

// Event handler for the "Previous" button
prev.onclick = function(){
    // Decrement active index or go to the end if at the beginning
    active = active - 1 >= 0 ? active - 1 : lengthItems;
    // Reload the slider
    reloadSlider();
}

// Auto-advancing the slider every 3000 milliseconds (3 seconds)
let refreshInterval = setInterval(() => {next.click()}, 3000);

// Function to reload the slider based on the active index
function reloadSlider(){
    // Adjust the left position of the slider based on the active item
    slider.style.left = -items[active].offsetLeft + 'px';

    // Update the active dot in the pagination
    let last_active_dot = document.querySelector('.slider .dots li.active');
    last_active_dot.classList.remove('active');
    dots[active].classList.add('active');

    // Reset the auto-advancing interval
    clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {next.click()}, 3000);
}

// Event listeners for dot pagination
dots.forEach((li, key) => {
    li.addEventListener('click', () => {
        // Set the active index to the clicked dot's index and reload the slider
        active = key;
        reloadSlider();
    });
})

// Reload the slider on window resize
window.onresize = function(event) {
    reloadSlider();
};

// Event handler for moving items between two lists (Next/Prev buttons for a different purpose)
document.getElementById('next1').onclick = function(){
    // Move the first item from the second list to the end of the first list
    let lists = document.querySelectorAll('.item2');
    document.getElementById('slide').appendChild(lists[0]);

    // Similar operation for another set of lists
    let lists1 = document.querySelectorAll('.item1');
    document.getElementById('slide1').appendChild(lists1[0]);
}

// Event handler for moving items between two lists (Next/Prev buttons for a different purpose)
document.getElementById('prev1').onclick = function(){
    // Move the last item from the second list to the beginning of the first list
    let lists = document.querySelectorAll('.item2');
    document.getElementById('slide').prepend(lists[lists.length - 1]);

    // Similar operation for another set of lists
    let lists1 = document.querySelectorAll('.item1');
    document.getElementById('slide1').prepend(lists1[lists1.length - 1]);
}
