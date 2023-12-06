import jsonConfs from '../json/tvConfirmations.json' assert { type: 'json' };
import jsonSymblsAB from '../json/abSymbols.json' assert { type: 'json' };

localStorage.setItem("lsCnfAtr", jsonConfs);
localStorage.setItem("SymbolListS", jsonSymblsAB);
//console.log(jsonConfs);