let hotItem = document.querySelectorAll('.hot-books .hot-book');
    let nextHot = document.getElementById('next-hot');
    let prevHot = document.getElementById('prev-hot');
    
    let activeHot = 3;
    function loadShow(){
        let stt = 0;
        hotItem[activeHot].style.transform = `none`;
        hotItem[activeHot].style.zIndex = 1;
        hotItem[activeHot].style.filter = 'none';
        hotItem[activeHot].style.opacity = 1;
        for(var i = activeHot + 1; i < hotItem.length; i++){
            stt++;
            hotItem[i].style.transform = `translateX(${320*stt}px) scale(${1 - 0.2*stt}) perspective(16px) rotateY(-1deg)`;
            hotItem[i].style.zIndex = -stt;
            hotItem[i].style.filter = 'blur(2px)';
            hotItem[i].style.opacity = stt > 2 ? 0 : 0.6;
        }
        stt = 0;
        for(var i = activeHot - 1; i >= 0; i--){
            stt++;
            hotItem[i].style.transform = `translateX(${-320*stt}px) scale(${1 - 0.2*stt}) perspective(16px) rotateY(1deg)`;
            hotItem[i].style.zIndex = -stt;
            hotItem[i].style.filter = 'blur(2px)';
            hotItem[i].style.opacity = stt > 2 ? 0 : 0.6;
        }
    }
    loadShow();
    nextHot.onclick = function(){
        activeHot = activeHot + 1 < hotItem.length ? activeHot + 1 : activeHot;
        loadShow();
    }
    prevHot.onclick = function(){
        activeHot = activeHot - 1 >= 0 ? activeHot - 1 : activeHot;
        loadShow();
    }