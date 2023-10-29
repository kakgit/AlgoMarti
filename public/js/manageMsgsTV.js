
function fnDeleteTvMsg(objRecId)
{
    let vDomainName = localStorage.getItem("lsUrl");
    let vRecId = $(objRecId).attr("data-id");
    let vUrl = `${vDomainName}api/tvMsgs/${vRecId}`;


    if(confirm("Are You Sure, You Want to Delete This Record?"))
    {
        fetch(vUrl, { method: 'POST' })
        .then(objRes => objRes.json())
        .then(string => {
    
            // Printing our response 
            console.log(string);
    
            // Printing our field of our response
            console.log(`Client :  ${string.message}`);
            location.replace(vDomainName + "manageMsgsTV");
        })
        .catch(errorMsg => {
            console.log(errorMsg);
        });
    }
}