import jsonConfs from '../json/tvConfirmations.json' with { type: 'json' };
//import jsonSymblsAB from '../json/abSymbols.json' with { type: 'json' };
//const jsonConfs = await import("../json/tvConfirmations.json", {assert: {type: "json"}});

localStorage.setItem("lsCnfAtr", jsonConfs);
//localStorage.setItem("SymbolListS", jsonSymblsAB);
//console.log(jsonConfs);
