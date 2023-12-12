window.addEventListener("scroll", function() {
    var header = this.document.querySelector('header');
    header.classList.toggle('sticky', this.window.scrollY > 0)
})

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

 