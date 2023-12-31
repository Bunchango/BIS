
//Open account pop-up window
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

// Open the pop up book mark
const openModalButtons = document.querySelectorAll(
    "[data-modal-target]:not(.submit-button)",
); // peevent the summit button
const closeModalButtons = document.querySelectorAll("[data-close-button]");
const overlay = document.getElementById("overlay");


openModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const modal = document.querySelector(button.dataset.modalTarget);
      
      openModal(modal);
    });
});

overlay.addEventListener("click", () => {
    const modals = document.querySelectorAll(".pop-up-modal.active");
    modals.forEach((modal) => {
        closeModal(modal);
    });
});

closeModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const modal = button.closest(".pop-up-modal");
        closeModal(modal);
        const successModel = button.closest(".pop-up-success"); // If there is a success model
        successModel.classList.remove("active");
    });
});

function openModal(modal) {
    if (modal == null) return;
    modal.classList.add("active");
    overlay.classList.add("active");
}

function closeModal(modal) {
    if (modal == null) return;
    modal.classList.remove("active");
    overlay.classList.remove("active");
}