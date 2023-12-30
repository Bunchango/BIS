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