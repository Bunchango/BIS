// Function to open the tab based on the hash fragment in the URL
function openTabFromHash() {
  var hash = window.location.hash.substr(1);

  if (!hash) {
    hash = "my-cart";
  }

  var tabContents = document.getElementsByClassName("tabcontent");
  for (var i = 0; i < tabContents.length; i++) {
    tabContents[i].style.display = "none";
  }

  // If the hash corresponds to a valid tab, open it
  var tabContent = document.getElementById(hash);
  if (tabContent) {
    tabContent.style.display = "block";

    // Find the corresponding tab button and add the 'active' class
    var tablinks = document.getElementsByClassName("tablinks");
    for (var i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
      if (tablinks[i].getAttribute("onclick").includes(hash)) {
        tablinks[i].className += " active";
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", openTabFromHash);
window.addEventListener("hashchange", openTabFromHash);

function openCity(evt, cityName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(cityName).style.display = "block";
  evt.currentTarget.className += " active";
}

function openModal(modal) {
  if (modal == null) return;
  modal.classList.add("active");
  overlay.classList.add("active");
}

// TODO: Update the profile without reloading the entire page
// TODO: Try to update the popup as well
// TODO: the image has not been  updated yet 
document.querySelector('.pop-up-modal .submit-button').addEventListener('click', function(event) {
  event.preventDefault(); // prevent the form from submitting normally
 
  let formData = new FormData(event.target.form); // get form data
 
  fetch('/reader/profile/edit-profile', {
    method: 'POST',
    body: formData,
    credentials: 'include', // include, *same-origin, omit
  }).then( response => {
    if (!response.ok) {
      return response.json().then(errorObj => {
        // Check if the error object has a 'msg' property
        if (errorObj.errors[0].msg) {
          throw new Error(errorObj.errors[0].msg);
        }
        // If not, just use the first error object as the error message
        else {
          throw new Error(errorObj.errors[0]);
        }
      });
    }
    return response.json();
  }).then(data => {
    if (data.success) {
      console.log(data)
      // Update the profile in the UI without reloading the page
      // You can replace this comment with your own code to update the UI
      if (data.updatedReader.username) document.querySelector('.user-info .name').innerText = `${data.updatedReader.username}`;
      
      if (data.updatedReader.background) {
        document.querySelector('.upper .background').src = `/${data.updatedReader.background}`;
        document.querySelector(".image-container #background").src = `/${data.updatedReader.background}`;
      }

      if (data.updatedReader.profilePicture) {
        document.querySelector('.user-info .avatar').src = `/${data.updatedReader.profilePicture}`;
        document.querySelector(".image-container .avatar").src = `/${data.updatedReader.profilePicture}`;
      }
      
      const button = document.querySelector(".submit-button")
      const popupSuccess = document.querySelector(button.dataset.modalTarget);
      openModal(popupSuccess);
      const errors = document.querySelector('.errors-update');
      errors.innerText = ''
      document.querySelector('#edit-profile-form').reset()

    }
  }).catch( error => {
    // Handle errors here
    // TODO: 
    console.log(error)
    const errors = document.querySelector('.errors-update');
    errors.innerText = ''
    errors.innerText = "Error: \n" + error.message;
    alert('Failed to update profile: ' + error.message);
    console.error('There has been a problem with your fetch operation: ', error.message);
  });
});


// Loan search
const search = document.querySelector('.input-group-loan input'),
    table_rows= document.querySelectorAll('.loan-body .tr-loan');

search.addEventListener('input', searchTableLoan);

function searchTableLoan() {
    table_rows.forEach((row, i) => {
        let table_data = row.textContent.toLowerCase(),
            search_data = search.value.toLowerCase()
        row.classList.toggle('hiding', table_data.indexOf(search_data) < 0);
        row.style.setProperty('--delay', i/25 + 's')
    })
    document.querySelectorAll('.loan-body .tr-loan:not(.hiding)').forEach((visible_row, i) => {
        visible_row.style.backgroundColor = (i % 2 == 0) ? 'transparent' : '#0000000b'  
    })
}

// Pickup 
const searchPickup = document.querySelector('.input-group-pickups input'),
    table_rows_pickups= document.querySelectorAll('.body-pickups .tr-pickups');

searchPickup.addEventListener('input', searchTable);

function searchTable() {
    table_rows_pickups.forEach((row, i) => {
        let table_data = row.textContent.toLowerCase(),
            search_data = searchPickup.value.toLowerCase()
        row.classList.toggle('hiding', table_data.indexOf(search_data) < 0);
        row.style.setProperty('--delay', i/25 + 's')
    })
    document.querySelectorAll('.body-pickups .tr-pickups:not(.hiding)').forEach((visible_row, i) => {
        visible_row.style.backgroundColor = (i % 2 == 0) ? 'transparent' : '#0000000b'  
    })
}