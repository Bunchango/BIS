let thisPage = 1;
let limit = 8;
let list = document.querySelectorAll('#pagination-item');

function updateLimitBasedOnScreenSize() {
    // Get the current window width
    const windowWidth = window.innerWidth;

    // Adjust the limit based on screen width
    if (windowWidth >= 1700) {
        limit = 8;
    } else if (windowWidth >= 800) {
        limit = 6;
    } else {
        limit = 4;
    }

    // Update the page content based on the new limit
    loadItem();
    listPage();
}

// Listen for the resize event to update the limit dynamically
window.addEventListener('resize', updateLimitBasedOnScreenSize);

function loadItem() {
    let beginGet = limit * (thisPage - 1);
    let endGet = limit * thisPage - 1;
    list.forEach((item, key) => {
        if (key >= beginGet && key <= endGet) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function listPage() {
    let count = Math.ceil(list.length / limit);
    document.querySelector('.listPage').innerHTML = '';

    if (thisPage != 1) {
        let prev = document.createElement('li');
        prev.innerText = 'PREV';
        prev.setAttribute('onclick', "changePage(" + (thisPage - 1) + ")");
        document.querySelector('.listPage').appendChild(prev);
    }

    for (i = 1; i <= count; i++) {
        let newPage = document.createElement('li');
        newPage.innerText = i;
        if (i == thisPage) {
            newPage.classList.add('active');
        }
        newPage.setAttribute('onclick', "changePage(" + i + ")");
        document.querySelector('.listPage').appendChild(newPage);
    }

    if (thisPage != count) {
        let next = document.createElement('li');
        next.innerText = 'NEXT';
        next.setAttribute('onclick', "changePage(" + (thisPage + 1) + ")");
        document.querySelector('.listPage').appendChild(next);
    }
}

function changePage(i) {
    thisPage = i;
    loadItem();
    listPage();
}

// Call the function initially
updateLimitBasedOnScreenSize();
