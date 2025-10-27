const GUN = Gun({ peers: ["http://192.168.1.4:8765/gun"], localStorage:false, radisk:false });
let web3, account, roomRef;

const $ = id => document.getElementById(id);

// Auto reconnect wallet
window.addEventListener("load", async ()=>{
  if(localStorage.wallet){
    account = localStorage.wallet;
    initChat();
  }
});

$("connectBtn").onclick = async ()=>{
  if(!window.ethereum) return alert("Install MetaMask!");
  const accounts = await ethereum.request({ method:"eth_requestAccounts" });
  account = accounts[0];
  localStorage.wallet = account;
  $("connectBtn").innerText = "Connected";
  $("joinBtn").disabled = false;
};

// Join room
$("joinBtn").onclick = ()=>{
  const room = $("roomInput").value.trim() || "global";
  $("roomName").innerText = "Room: "+room;
  $("userShort").innerText = account.slice(0,6)+"..."+account.slice(-4);
  document.getElementById("loginBox").style.display="none";
  document.getElementById("chatBox").style.display="block";
  startChat(room);
};

function startChat(room){
  roomRef = GUN.get("room:"+room);
  roomRef.map().on((msg,id)=>{
    if(!msg) return;
    renderMsg(msg);
  });
}

function renderMsg(m){
  const self = m.from===account;
  const delay = Date.now()-m.time;
  const div = document.createElement("div");
  div.className = "mb-2 p-2 rounded "+(self?"bg-success text-end":"bg-dark text-start");
  div.innerHTML = `<small class="text-muted">${m.from.slice(0,8)} · ${delay}ms</small><br>${escape(m.text)}`;
  $("messages").appendChild(div);
  $("messages").scrollTop = $("messages").scrollHeight;
}

function escape(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

$("sendBtn").onclick = sendMsg;
$("msgInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendMsg()});

function sendMsg(){
  const txt = $("msgInput").value.trim();
  if(!txt) return;
  const msg = { from: account, text: txt, time: Date.now() };
  roomRef.set(msg);
  $("msgInput").value="";
}
