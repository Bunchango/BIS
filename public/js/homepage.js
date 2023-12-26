const openModalButtons = document.querySelectorAll('[data-modal-target]')
const closeModalButtons = document.querySelectorAll('[data-close-button]')
const overlay = document.getElementById('overlay')

openModalButtons.forEach(button => {
    button.addEventListener('click', () => {
        const modal = document.querySelector(button.dataset.modalTarget)
        openModal(modal)
    })
})

overlay.addEventListener('click', () => {
    const modals = document.querySelectorAll('.pop-up-modal.active')
    modals.forEach(modal => {
        closeModal(modal)
    })
})

closeModalButtons.forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('.pop-up-modal')
        closeModal(modal)
    })
})

function openModal(modal) {
    if (modal == null) return
    modal.classList.add('active')
    overlay.classList.add('active')
}

function closeModal(modal) {
    if (modal == null) return
    modal.classList.remove('active')
    overlay.classList.remove('active')
}

// open the account hovering
const accountWindow = document.querySelector("#account-hovering")
const avaImage = document.querySelector("#account_img")
const account = document.querySelector("#account")
if(avaImage){
    avaImage.addEventListener("click", () =>{
        const computedStyle = window.getComputedStyle(accountWindow);
        if (computedStyle.display === "none") {
            // Change the display style to 'block'
            accountWindow.style.display = "block";
        } else {
            accountWindow.style.display = "none";
        }
    })
}


// Get all the icon elements
const icons = document.querySelectorAll('.bookmark-icon');

icons.forEach(icon => {
   icon.addEventListener('click', (event) => {
        console.log("click");
        // Prevent the default action
        event.preventDefault();
        const bookId = event.target.dataset.bookid;
        console.log(bookId)

        if (icon.classList.contains('far')) { // add to wishlist
            fetch(`/reader/wishlist/${bookId}?action=add`, { method: 'POST', credentials: 'include' })
            .then(response => { 
                if (!response.ok) {
                   throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    icon.classList.remove('far');
                    icon.classList.add('fas'); 
                } else {
                    console.log(data.success)
                    console.log('Error:', data.error);
                    console.log('fail to add to wishlist')
                }
            }).catch(error => console.error('There has been a problem with your fetch operation: ', error));
        } else if (icon.classList.contains('fas')) {
            fetch(`/reader/wishlist/${bookId}?action=remove`, { method: 'POST', credentials: 'include' })
            .then(response => { 
                if (!response.ok) {
                  throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                   icon.classList.remove('fas');
                   icon.classList.add('far');
                } else {
                   console.log('Error:', data.error);
                   console.log('fail to remove from wishlist')
                }
            }).catch(error => console.error('There has been a problem with your fetch operation: ', error));
        }
   });
});
// // Bookmark Icon
// icon.addEventListener('click', function() {
//     const bookId = this.dataset.bookId;
//     fetch(`/reader/wishlist/${bookId}`, { method: 'POST' })
//       .then(response => response.json())
//       .then(data => {
//         if (data.success && icon.classList.contains('fa-regular')) {
//             icon.classList.remove('fa-regular');
//             icon.classList.add('fa-solid');
//         } else {
//             // If it doesn't, remove 'fa-solid' and add 'fa-regular'
//             icon.classList.remove('fa-solid');
//             icon.classList.add('fa-regular');
//         }
//       });
//   });