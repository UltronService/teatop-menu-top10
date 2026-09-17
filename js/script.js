document.querySelector('.L05Ename').addEventListener('animationend', (event) => {
  // 只在 fadeOut 這個動畫結束時才執行重置
  if (event.animationName === "fadeOut") {
    setTimeout(() => {
      const animationElements = document.querySelectorAll('.animation *');
      animationElements.forEach(element => {
        element.style.animation = 'none';  // 停止動畫
        void element.offsetWidth;  // 重新觸發渲染 (重置動畫)
      });

      // 重新賦值動畫
      document.querySelector('.Ltop01').style.animation = 'slideIn 0.5s 1 linear 0s forwards , slideOut 0.5s 1 linear 5s forwards';
      document.querySelector('.Ltea01').style.animation = 'rotate01 1s 1 ease-out 0s forwards , rotate02 1s 1 ease-out 5s forwards';
      document.querySelector('.Lleaf01').style.animation = 'drop 0.5s 1 ease-in 1s forwards , float04 1s infinite linear 1.5s , fadeOut 0.1s 1 linear 4.9s forwards';
      document.querySelector('.Rleaf01').style.animation = 'drop 0.5s 1 ease-in 1s forwards , float03 1s infinite linear 1.5s , fadeOut 0.1s 1 linear 4.9s forwards';
      document.querySelector('.L01Cname').style.animation = 'fadeIn 0.3s 1 linear 1.7s forwards , fadeOut 0.3s 1 linear 4.7s forwards';
      document.querySelector('.L01Ename').style.animation = 'fadeIn 0.3s 1 linear 2s forwards , fadeOut 0.3s 1 linear 5s forwards';
      
      document.querySelector('.Ltop02').style.animation = 'slideIn 0.5s 1 linear 5.5s forwards , slideOut 0.5s 1 linear 10.5s forwards';
      document.querySelector('.Ltea02').style.animation = 'rotate01 1s 1 ease-out 5.5s forwards , rotate02 1s 1 ease-out 10.5s forwards';
      document.querySelector('.Lleaf02').style.animation = 'drop 0.5s 1 ease-in 6.5s forwards , float03 1s infinite linear 7s , fadeOut 0.1s 1 linear 10.4s forwards';
      document.querySelector('.Rleaf02').style.animation = 'drop 0.5s 1 ease-in 6.5s forwards , float04 1s infinite linear 7s , fadeOut 0.1s 1 linear 10.4s forwards';
      document.querySelector('.L02Cname').style.animation = 'fadeIn 0.3s 1 linear 7.2s forwards , fadeOut 0.3s 1 linear 10.2s forwards';
      document.querySelector('.L02Ename').style.animation = 'fadeIn 0.3s 1 linear 7.5s forwards , fadeOut 0.3s 1 linear 10.5s forwards';
    
      document.querySelector('.Ltop03').style.animation = 'slideIn 0.5s 1 linear 11s forwards , slideOut 0.5s 1 linear 16s forwards';
      document.querySelector('.Ltea03').style.animation = 'rotate01 1s 1 ease-out 11s forwards , rotate02 1s 1 ease-out 16s forwards';
      document.querySelector('.Lleaf03').style.animation = 'drop 0.5s 1 ease-in 12s forwards , float04 1s infinite linear 12.5s , fadeOut 0.1s 1 linear 15.9s forwards';
      document.querySelector('.Rleaf03').style.animation = 'drop 0.5s 1 ease-in 12s forwards , float03 1s infinite linear 12.5s , fadeOut 0.1s 1 linear 15.9s forwards';
      document.querySelector('.L03Cname').style.animation = 'fadeIn 0.3s 1 linear 12.7s forwards , fadeOut 0.3s 1 linear 15.7s forwards';
      document.querySelector('.L03Ename').style.animation = 'fadeIn 0.3s 1 linear 13s forwards , fadeOut 0.3s 1 linear 16s forwards';
      
      
      document.querySelector('.Ltop04').style.animation = 'slideIn 0.5s 1 linear 16.5s forwards , slideOut 0.5s 1 linear 21.5s forwards';
      document.querySelector('.Ltea04').style.animation = 'rotate01 1s 1 ease-out 16.5s forwards , rotate02 1s 1 ease-out 21.5s forwards';
      document.querySelector('.Lleaf04').style.animation = 'drop 0.5s 1 ease-in 17.5s forwards , float04 1s infinite linear 18s , fadeOut 0.1s 1 linear 21.4s forwards';
      document.querySelector('.Rleaf04').style.animation = 'drop 0.5s 1 ease-in 17.5s forwards , float03 1s infinite linear 18s , fadeOut 0.1s 1 linear 21.4s forwards';
      document.querySelector('.L04Cname').style.animation = 'fadeIn 0.3s 1 linear 18.2s forwards , fadeOut 0.3s 1 linear 21.2s forwards';
      document.querySelector('.L04Ename').style.animation = 'fadeIn 0.3s 1 linear 18.5s forwards , fadeOut 0.3s 1 linear 21.5s forwards';
      
      
       document.querySelector('.Ltop05').style.animation = 'slideIn 0.5s 1 linear 22s forwards , slideOut 0.5s 1 linear 27s forwards';
      document.querySelector('.Ltea05').style.animation = 'rotate01 1s 1 ease-out 22s forwards , rotate02 1s 1 ease-out 27s forwards';
      document.querySelector('.Lleaf05').style.animation = 'drop 0.5s 1 ease-in 23s forwards , float03 1s infinite linear 23.5s , fadeOut 0.1s 1 linear 26.9s forwards';
      document.querySelector('.Rleaf05').style.animation = 'drop 0.5s 1 ease-in 23s forwards , float04 1s infinite linear 23.5s , fadeOut 0.1s 1 linear 26.9s forwards';
      document.querySelector('.L05Cname').style.animation = 'fadeIn 0.3s 1 linear 23.7s forwards , fadeOut 0.3s 1 linear 26.7s forwards';
      document.querySelector('.L05Ename').style.animation = 'fadeIn 0.3s 1 linear 24s forwards , fadeOut 0.3s 1 linear 27s forwards';
      

      document.querySelector('.Lcircle').style.animation = 'float01 1s infinite linear 0s';
      document.querySelector('.Rcircle').style.animation = 'float02 1s infinite linear 0s';
      
      document.querySelector('.Rrow01').style.animation = 'bgcolorlof 0.1s linear 0.5s 1 forwards , bgcolorof 0.1s linear 5.3s 1 reverse forwards';
      document.querySelector('.Rrow01 .large').style.animation = 'bgcolorbo 0.1s linear 0.5s 1 forwards , bgcolorbo 0.1s linear 5.3s 1 reverse forwards';
      
      document.querySelector('.Rrow02').style.animation = 'bgcolorlof 0.1s linear 6s 1 forwards , bgcolorlof 0.1s linear 10.8s 1 reverse forwards';
      document.querySelector('.Rrow02 .large').style.animation = 'bgcolorbo 0.1s linear 6s 1 forwards , bgcolorbo 0.1s linear 10.8s 1 reverse forwards';
      
      document.querySelector('.Rrow03').style.animation = 'bgcolorof 0.1s linear 11.5s 1 forwards , bgcolorof 0.1s linear 16.3s 1 reverse forwards';
      document.querySelector('.Rrow03 .large').style.animation = 'bgcolorbo 0.1s linear 11.5s 1 forwards , bgcolorbo 0.1s linear 16.3s 1 reverse forwards';
      
      document.querySelector('.Rrow04').style.animation = 'bgcolorlof 0.1s linear 17s 1 forwards , bgcolorlof 0.1s linear 21.8s 1 reverse forwards';
      document.querySelector('.Rrow04 .large').style.animation = 'bgcolorbo 0.1s linear 17s 1 forwards , bgcolorbo 0.1s linear 21.8s 1 reverse forwards';
      
      document.querySelector('.Rrow05').style.animation = 'bgcolorof 0.1s linear 22.5s 1 forwards , bgcolorof 0.1s linear 27.3s 1 reverse forwards';
      document.querySelector('.Rrow05 .large').style.animation = 'bgcolorbo 0.1s linear 22.5s 1 forwards , bgcolorbo 0.1s linear 27.3s 1 reverse forwards';
      
      document.querySelector('.R01no').style.animation = 'colorfo 0.1s linear 0.5s 1 forwards , colorfo 0.1s linear 5.3s 1 reverse forwards';
      document.querySelector('.R01price').style.animation = 'colorfo 0.1s linear 0.5s 1 forwards , colorfo 0.1s linear 5.3s 1 reverse forwards';
      document.querySelector('.R01moneysign').style.animation = 'colorbo 0.1s linear 0.5s 1 forwards , colorbo 0.1s linear 5.3s 1 reverse forwards';
      document.querySelector('.R01Cname').style.animation = 'filtero 0.1s linear 0.5s 1 forwards, filtero 0.1s linear 5.3s 1 reverse forwards';
      document.querySelector('.R01Ename').style.animation = 'filtero 0.1s linear 0.5s 1 forwards, filtero 0.1s linear 5.3s 1 reverse forwards';
      
      document.querySelector('.R02no').style.animation = 'colorfo 0.1s linear 6s 1 forwards , colorfo 0.1s linear 10.8s 1 reverse forwards';
      document.querySelector('.R02price').style.animation = 'colorfo 0.1s linear 6s 1 forwards , colorfo 0.1s linear 10.8s 1 reverse forwards';
      document.querySelector('.R02moneysign').style.animation = 'colorbo 0.1s linear 6s 1 forwards , colorbo 0.1s linear 10.8s 1 reverse forwards';
      document.querySelector('.R02Cname').style.animation = 'filtero 0.1s linear 6s 1 forwards, filtero 0.1s linear 10.8s 1 reverse forwards';
      document.querySelector('.R02Ename').style.animation = 'filtero 0.1s linear 6s 1 forwards, filtero 0.1s linear 10.8s 1 reverse forwards';
      
      document.querySelector('.R03no').style.animation = 'colorfo 0.1s linear 11.5s 1 forwards , colorfo 0.1s linear 16.3s 1 reverse forwards';
      document.querySelector('.R03price').style.animation = 'colorfo 0.1s linear 11.5s 1 forwards , colorfo 0.1s linear 16.3s 1 reverse forwards';
      document.querySelector('.R03moneysign').style.animation = 'colorbo 0.1s linear 11.5s 1 forwards , colorbo 0.1s linear 16.3s 1 reverse forwards';
      document.querySelector('.R03Cname').style.animation = 'filtero 0.1s linear 11.5s 1 forwards, filtero 0.1s linear 16.3s 1 reverse forwards';
      document.querySelector('.R03Ename').style.animation = 'filtero 0.1s linear 11.5s 1 forwards, filtero 0.1s linear 16.3s 1 reverse forwards';
      
      document.querySelector('.R04no').style.animation = 'colorfo 0.1s linear 17s 1 forwards , colorfo 0.1s linear 21.8s 1 reverse forwards';
      document.querySelector('.R04price').style.animation = 'colorfo 0.1s linear 17s 1 forwards , colorfo 0.1s linear 21.8s 1 reverse forwards';
      document.querySelector('.R04moneysign').style.animation = 'colorbo 0.1s linear 17s 1 forwards , colorbo 0.1s linear 21.8s 1 reverse forwards';
      document.querySelector('.R04Cname').style.animation = 'filtero 0.1s linear 17s 1 forwards, filtero 0.1s linear 21.8s 1 reverse forwards';
      document.querySelector('.R04Ename').style.animation = 'filtero 0.1s linear 17s 1 forwards, filtero 0.1s linear 21.8s 1 reverse forwards';
      
      document.querySelector('.R05no').style.animation = 'colorfo 0.1s linear 22.5s 1 forwards , colorfo 0.1s linear 27.3s 1 reverse forwards';
      document.querySelector('.R05price').style.animation = 'colorfo 0.1s linear 22.5s 1 forwards , colorfo 0.1s linear 27.3s 1 reverse forwards';
      document.querySelector('.R05moneysign').style.animation = 'colorbo 0.1s linear 17s 1 forwards , colorbo 0.1s linear 27.3s 1 reverse forwards';
      document.querySelector('.R05Cname').style.animation = 'filtero 0.1s linear 22.5s 1 forwards, filtero 0.1s linear 27.3s 1 reverse forwards';
      document.querySelector('.R05Ename').style.animation = 'filtero 0.1s linear 22.5s 1 forwards, filtero 0.1s linear 27.3s 1 reverse forwards';
      
    
    }, 500); 
  }
});