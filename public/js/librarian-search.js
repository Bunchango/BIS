
// Borrow search
const borrowsCardTemplate = document.querySelector("[data-borrows-template]")
const borrowsCardContainer = document.querySelector("[data-borrows-container]")
const searchBorrowInput = document.querySelector("[data-borrow-search]")

let borrows = []
if (searchBorrowInput) {
    searchBorrowInput.addEventListener("input", e => {
        const value = e.target.value.toLowerCase()
        borrows.forEach(borrow => {
            const isVisible = borrow.username.toLowerCase().includes(value) || 
                            borrow.gmail.toLowerCase().includes(value) ||
                            borrow.createdOn.toLowerCase().includes(value)
            borrow.element.classList.toggle("hide", !isVisible)
        })
        console.log(borrows)
    })
}

fetch("http://localhost:5000/librarian/borrows")
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log(data)
        borrows = data.borrows.map(borrow => {
            const card = borrowsCardTemplate.content.cloneNode(true).children[0]
            const header = card.querySelector("[data-header]")
            const body = card.querySelector("[data-body]")
            const img = card.querySelector("[data-img]")

            // TODO: add the href for a tag
            card.href = `/librarian/borrow/${borrow._id}`

            // TODO: add the content for the header
            header.textContent = borrow.reader.username

            // TODO: create tag p inside body that has id = gmail 
            const pTagForGmail = document.createElement('p');
            pTagForGmail.id = 'gmail';
            pTagForGmail.textContent = borrow.reader.gmail;
            body.appendChild(pTagForGmail);

            // TODO: create tag p inside body that has id = createOn 
            const pTagForCreatedOn = document.createElement('p');
            pTagForCreatedOn.id = 'createdOn';
            pTagForCreatedOn.textContent = borrow.createdOn;
            body.appendChild(pTagForCreatedOn);

            // TODO: Create img tag in side img
            const imgTag = document.createElement('img')
            imgTag.src = "/" + borrow.reader.profilePicture
            console.log(borrow.reader.profilePicture)
            imgTag.classList = "w-full h-full object-cover"
            imgTag.alt = borrow.reader.username + "'s Image"
            img.appendChild(imgTag)

            borrowsCardContainer.append(card)
            return {username: borrow.reader.username, gmail: borrow.reader.gmail, createdOn: borrow.createdOn, element: card}
        })
    })



// Pickups Search
const pickupsCardTemplate = document.querySelector("[data-pickups-template]")
const pickupsCardContainer = document.querySelector("[data-pickups-container]")
const searchPickupInput = document.querySelector("[data-pickup-search]")

let pickups = []

if (searchPickupInput) {
    searchPickupInput.addEventListener("input", e => {
        const value = e.target.value.toLowerCase()
        pickups.forEach(pickup => {
            const isVisible = pickup.username.toLowerCase().includes(value) || 
                            pickup.gmail.toLowerCase().includes(value) ||
                            pickup.createdOn.toLowerCase().includes(value)
            pickup.element.classList.toggle("hide", !isVisible)
        })
        console.log(pickups)
    })
}

fetch("http://localhost:5000/librarian/pickups")
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        pickups = data.pickups.map(pickup => {
            const card = pickupsCardTemplate.content.cloneNode(true).children[0]
            console.log(card)
            const header = card.querySelector("[data-header]")
            const body = card.querySelector("[data-body]")
            const img = card.querySelector("[data-img]")

            // TODO: add the href for a tag
            card.href = `/librarian/pickup/${pickup._id}`

            // TODO: add the content for the header
            header.textContent = pickup.reader.username

            // TODO: create tag p inside body that has id = gmail 
            const pTagForGmail = document.createElement('p');
            pTagForGmail.id = 'gmail';
            pTagForGmail.textContent = pickup.reader.gmail;
            body.appendChild(pTagForGmail);

            // TODO: create tag p inside body that has id = createOn 
            const pTagForCreatedOn = document.createElement('p');
            pTagForCreatedOn.id = 'createdOn';
            pTagForCreatedOn.textContent = pickup.createdOn;
            body.appendChild(pTagForCreatedOn);

            // TODO: Create img tag in side img
            const imgTag = document.createElement('img')
            imgTag.src = "/" + pickup.reader.profilePicture
            imgTag.classList = "w-full h-full object-cover"
            imgTag.alt = pickup.reader.username + "'s Image"
            img.appendChild(imgTag)

            pickupsCardContainer.append(card)
            console.log(card)
            return {username: pickup.reader.username, gmail: pickup.reader.gmail, createdOn: pickup.createdOn, element: card}
    })
})




// Request Search
const requestsCardTemplate = document.querySelector("[data-requests-template]")
const requestsCardContainer = document.querySelector("[data-requests-container]")
const searchRequestInput = document.querySelector("[data-request-search]")

let requests = []

if (searchRequestInput) {
    searchRequestInput.addEventListener("input", e => {
        const value = e.target.value.toLowerCase()
        requests.forEach(request => {
            const isVisible = request.username.toLowerCase().includes(value) || 
                            request.gmail.toLowerCase().includes(value) ||
                            request.createdOn.toLowerCase().includes(value)

            request.element.classList.toggle("hide", !isVisible)
        })
        console.log(requests)
    })
}

fetch("http://localhost:5000/librarian/requests")
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        requests = data.requests.map(request => {
            const card = requestsCardTemplate.content.cloneNode(true).children[0]
            const header = card.querySelector("[data-header]")
            const body = card.querySelector("[data-body]")
            const img = card.querySelector("[data-img]")

            // TODO: add the href for a tag
            card.href = `/librarian/request/${request._id}`

            // TODO: add the content for the header
            header.textContent = request.reader.username

            // TODO: create tag p inside body that has id = gmail 
            const pTagForGmail = document.createElement('p');
            pTagForGmail.id = 'gmail';
            pTagForGmail.textContent = request.reader.gmail;
            body.appendChild(pTagForGmail);

            // TODO: create tag p inside body that has id = createOn 
            const pTagForCreatedOn = document.createElement('p');
            pTagForCreatedOn.id = 'createdOn';
            pTagForCreatedOn.textContent = request.createdOn;
            body.appendChild(pTagForCreatedOn);

            // TODO: Create img tag in side img
            const imgTag = document.createElement('img')
            imgTag.src = "/" + request.reader.profilePicture
            imgTag.alt = request.reader.username + "'s Image"
            imgTag.classList = "w-full h-full object-cover"
            img.appendChild(imgTag)

            requestsCardContainer.append(card)
            console.log(card)
            return {username: request.reader.username, gmail: request.reader.gmail, createdOn: request.createdOn, element: card}
    })
})