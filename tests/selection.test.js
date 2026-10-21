import test from 'node:test';
import assert from 'node:assert/strict';
import {selectGoods,normalizeMeal,sushiAvailable,hasMeal} from '../selection.js';
import {calculateHouse} from '../rules.js';
const house=extra=>({number:'3',type:'garden',price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,noodles:0,sushi:0,kimchi:0,...extra});

test('Noodles and Sushi replace all ordinary demand and each other while preserving Kimchi and coffee',()=>{
  for(const key of ['noodles','sushi']){
    const selected=selectGoods(house({burger:2,pizza:1,soda:3,kimchi:1,coffees:[1,2]}),key,4);
    assert.equal(selected[key],4);assert.equal(selected.burger+selected.pizza+selected.soda,0);
    assert.equal(selected.kimchi,1);assert.deepEqual(selected.coffees,[1,2]);
    const other=selectGoods(selected,key==='sushi'?'noodles':'sushi',2);
    assert.equal(other[key],0);assert.doesNotThrow(()=>calculateHouse(other));
  }
});
test('Every ordinary product clears both replacements, and deleting the final meal clears Kimchi',()=>{
  for(const key of ['burger','pizza','beer','lemonade','soda']){
    const selected=selectGoods(house({sushi:2,kimchi:1}),key,1);
    assert.equal(selected.sushi,0);assert.equal(selected.noodles,0);assert.equal(selected.kimchi,1);
    const empty=selectGoods(selected,key,0);assert.equal(empty.kimchi,0);assert.equal(hasMeal(empty),false);
  }
});
test('Sushi is unavailable without a selected garden, including apartments and park-only houses',()=>{
  for(const extra of [{number:''},{number:'2',type:'normal'},{number:'π',type:'normal',park:true}]){
    const h=house(extra);assert.equal(sushiAvailable(h),false);assert.equal(selectGoods(h,'sushi',2).sushi,0);
    const cleared=normalizeMeal({...h,sushi:2,kimchi:1});assert.equal(cleared.sushi,0);assert.equal(cleared.kimchi,0);
  }
});
test('All product-switch sequences remain either a valid complete meal or an empty form',()=>{
  for(const type of ['normal','garden'])for(const first of ['burger','pizza','beer','lemonade','soda','noodles','sushi'])for(const next of ['burger','pizza','beer','lemonade','soda','noodles','sushi']){
    let h=selectGoods(house({type}),first,2);h=selectGoods(h,next,1);
    if(hasMeal(h))assert.doesNotThrow(()=>calculateHouse(h));
  }
});
