document.getElementById("subButton").onclick = doThis();
function doThis(){
    var p1 = document.getElementById("pword").value;
    var p2 = document.getElementById("confirmpword").value;
    if(p1 != p2){
        alert("Please enter matching passwords");
    }else{
        alert("Account created");
    }
}