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
