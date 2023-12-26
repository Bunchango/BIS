// Function to handle form submission
async function handleFormSubmission(form) {
  try {
    const response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      // Redirect to the current page
      window.location.reload(true);
    } else {
      const errorData = await response.json();
      alert(errorData.errors);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Attach event listener to each form with class "form"
const wishlistForms = document.querySelectorAll(".form");
wishlistForms.forEach((form) => {
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    handleFormSubmission(this);
  });
});
