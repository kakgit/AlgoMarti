import jsonConfs from '../json/tvConfirmations.json?v=1' with { type: 'json' };
import jsonSymblsAB from '../json/abSymbols.json?v=1' with { type: 'json' };

localStorage.setItem("lsCnfAtr", jsonConfs);
localStorage.setItem("SymbolListS", jsonSymblsAB);
//console.log(jsonConfs);
