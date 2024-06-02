import jsonConfs from '../json/tvConfirmations.json' with { type: 'json' };
import jsonSymblsAB from '../json/abSymbols.json' with { type: 'json' };

localStorage.setItem("lsCnfAtr", jsonConfs);
localStorage.setItem("SymbolListS", jsonSymblsAB);
//console.log(jsonConfs);