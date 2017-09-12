"use strict";
var http = require('http')
var cheerio = require('cheerio')
var request = require('request')
var fs = require('fs')
var Promise = require('bluebird')//虽然原生已经支持，但bluebird效率更高
var iplist = require('../ip_http.json') //代理池

//发送请求，成功写入文件，失败换代理
var getHtml = function (url,ipac,page) {
  return new Promise(function(resolve,reject){
    if (ipac >= iplist.length){
      console.log('page:'+page+'all died'); //代理用完，取消当前页面的请求
      reject(url,false);
    }
    let prox = {    //设置代理
      url: url,
      proxy: 'http://' + iplist[ipac],
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        'Referer': "https://cnodejs.org/?tab=all"
      }
    };
    request(prox, function (err, res, body) {
      if (err) {
        reject(url)//失败，回传当前请求的页面url
      } else {
        resolve(body, url)//成功回传html和url
      }
    })
  })
}
//解析doc
function filterHtml(html,p,noww){
  let res = [];//存放结果集
  var $ = cheerio.load(html);
  if($('title').text().indexOf('招聘') === -1) {    //根据title判断是否被代理重定向
    iplist.splice(noww[2],1);   //删除假代理。
    return lhlh(noww[0],noww[1],noww[2]+1);
  }
  $('.cell').each(function(item){
    res.push({
      title: $(this).find('.topic_title').text().replace(/\s+/g,"").replace(/\n/g,''),
      count: $(this).find('.count_of_visits').text().replace(/\s+/g,"").replace(/\n/g,''),
      href: "https://cnodejs.org"+$(this).find('.topic_title').attr("href")
    })
  })
  res.shift();//删除表头行
  console.log(res.length);
  if(res.length < 10){//如果条目少于xx个
    return lhlh(noww[0],noww[1],noww[2]+1);
  }
  return creatfile(res,p);
}
//写入本地
function creatfile(list,page) {
  var ttxt = 'page:' + page + '\r\n';//每页标题
  list.forEach(function(el) {  //遍历数据为文本
    ttxt += el.title + '\r\n点击数：'+ el.count + '\r\n链接地址：'+ el.href + '\r\n\r\n';
  });
  fs.appendFile('./' + 'cnodejs.txt', 'page:'+ttxt+'\r\n' , 'utf-8', function (err) {
    if (!err) {
      let currTime = Math.round((Date.parse(new Date()) - startTime) / 1000);
      console.log('page:' + page +' is ok.total:' +list.length + ',spend:' + currTime + 's' ); // page:1 is ok
    }
  })
}

//请求封装为promise
function lhlh(url,page,ipac){
  getHtml(url,ipac,page).then((html,oldurl)=>{
    let noww= [url,page,ipac]
    filterHtml(html,page,noww);
  })
    .catch((url,type = true)=>{
      if(type){
        ipac += 1;
        lhlh(url,page,ipac);
      }
    })
}
var target = 'https://cnodejs.org/?tab=job&page=';
let ipacc = 0;
var startTime = Date.parse(new Date());
for(let i=1; i<12; i++){
  let ourl = target + i;
  lhlh(ourl, i, 0);
}
