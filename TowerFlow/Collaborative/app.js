import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const $ = id => document.getElementById(id);
const clientReady = SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT") &&
  SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
const supabase = clientReady ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let user = null, currentRoom = null, messageChannel = null, activityChannel = null, rooms = [];

function status(message, connected = false) {
  $("connection").textContent = message;
  $("connection").classList.toggle("connected", connected);
}
function authMessage(message, error = false) {
  $("authMessage").textContent = message;
  $("authMessage").classList.toggle("error", error);
}
function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function dateLabel(value) {
  return new Intl.DateTimeFormat(undefined,{dateStyle:"short",timeStyle:"short"}).format(new Date(value));
}
function showSignedIn(signedIn) {
  $("authPanel").hidden = signedIn;
  $("appPanel").hidden = !signedIn;
  $("signOut").hidden = !signedIn;
}
async function loadRooms() {
  const { data, error } = await supabase.from("room_members")
    .select("role, rooms(id,name,created_at,updated_at)")
    .order("joined_at", { ascending: false });
  if (error) throw error;
  rooms = (data || []).filter(row => row.rooms).map(row => ({...row.rooms, role:row.role}));
  $("roomCount").textContent = String(rooms.length);
  $("roomList").innerHTML = rooms.length ? rooms.map(room =>
    '<button class="room-item '+(currentRoom?.id===room.id?'active':'')+'" data-room="'+room.id+'"><strong>'+safe(room.name)+'</strong><small>'+safe(room.role)+' · '+dateLabel(room.updated_at || room.created_at)+'</small></button>'
  ).join("") : '<p class="muted">No rooms yet. Create one or use an invitation link.</p>';
}
async function openRoom(roomId) {
  const room = rooms.find(item => item.id === roomId);
  if (!room) return;
  if (messageChannel) await supabase.removeChannel(messageChannel);
  if (activityChannel) await supabase.removeChannel(activityChannel);
  currentRoom = room;
  $("emptyRoom").hidden = true;
  $("activeRoom").hidden = false;
  $("activeRoomName").textContent = room.name;
  $("activeRoomRole").textContent = "Your role: " + room.role;
  $("inviteButton").hidden = room.role !== "owner";
  $("invitePanel").hidden = true;
  $("messages").innerHTML = '<p class="muted">Loading conversation…</p>';
  $("activityList").innerHTML = '<p class="muted">Loading activity…</p>';
  await loadRooms();
  const [messagesResult, activityResult] = await Promise.all([
    supabase.from("room_messages").select("id,user_id,body,created_at").eq("room_id",roomId).order("created_at",{ascending:true}).limit(100),
    supabase.from("room_activity").select("id,actor_id,action,details,created_at").eq("room_id",roomId).order("created_at",{ascending:false}).limit(20)
  ]);
  if (messagesResult.error) throw messagesResult.error;
  if (activityResult.error) throw activityResult.error;
  renderMessages(messagesResult.data || []);
  renderActivity(activityResult.data || []);
  messageChannel = supabase.channel("room-messages-"+roomId)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"room_messages",filter:"room_id=eq."+roomId},payload=>{
      appendMessage(payload.new);
    }).subscribe();
  activityChannel = supabase.channel("room-activity-"+roomId)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"room_activity",filter:"room_id=eq."+roomId},payload=>{
      prependActivity(payload.new);
    }).subscribe();
}
function appendMessage(message) {
  const empty = $("messages").querySelector(".muted"); if (empty) empty.remove();
  if ($("messages").querySelector('[data-message="'+message.id+'"]')) return;
  const node = document.createElement("article");
  node.className = "message"+(message.user_id===user.id?" mine":"");
  node.dataset.message = message.id;
  node.innerHTML = '<div class="message-meta"><span>'+ (message.user_id===user.id?"You":"Room member") +'</span><span>'+dateLabel(message.created_at)+'</span></div><div class="message-body">'+safe(message.body)+'</div>';
  $("messages").append(node);
  $("messages").scrollTop = $("messages").scrollHeight;
}
function renderMessages(items) {
  $("messages").innerHTML = "";
  items.forEach(appendMessage);
  if (!items.length) $("messages").innerHTML = '<p class="muted">No messages yet. Start the conversation.</p>';
}
function prependActivity(item) {
  if ($("activityList").querySelector('[data-activity="'+item.id+'"]')) return;
  const node=document.createElement("div");
  node.className="activity"; node.dataset.activity=item.id;
  node.innerHTML='<strong>'+safe(item.action.replaceAll("."," "))+'</strong><small>'+dateLabel(item.created_at)+'</small>';
  $("activityList").prepend(node);
}
function renderActivity(items) {
  $("activityList").innerHTML="";
  items.forEach(prependActivity);
  if (!items.length) $("activityList").innerHTML='<p class="muted">Room activity will appear here.</p>';
}
async function initializeSession(session) {
  user = session?.user || null;
  showSignedIn(Boolean(user));
  if (!user) { currentRoom=null; status("Not connected"); return; }
  status("Signed in · syncing",true);
  const displayName = user.user_metadata?.full_name || user.email || "TowerFlow member";
  await supabase.from("profiles").upsert({id:user.id,display_name:displayName},{onConflict:"id"});
  const inviteToken = new URLSearchParams(location.search).get("invite");
  if (inviteToken) {
    const {error}=await supabase.rpc("accept_room_invite",{p_token:inviteToken});
    if (error) throw error;
    const url=new URL(location.href); url.searchParams.delete("invite"); history.replaceState({}, "", url);
  }
  await loadRooms();
  status("Connected",true);
}
$("signInForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if (!supabase) return authMessage("Setup required: copy config.example.js to config.js and add your Supabase project URL and public anon/publishable key.",true);
  const email=$("email").value.trim();
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname+location.search}});
  authMessage(error?error.message:"Sign-in link sent. Open the email on this device to continue.",Boolean(error));
});
$("signOut").addEventListener("click",async()=>{
  if (messageChannel) await supabase.removeChannel(messageChannel);
  if (activityChannel) await supabase.removeChannel(activityChannel);
  await supabase.auth.signOut(); currentRoom=null; $("activeRoom").hidden=true; $("emptyRoom").hidden=false; showSignedIn(false); status("Signed out");
});
$("createRoomForm").addEventListener("submit",async event=>{
  event.preventDefault(); const name=$("roomName").value.trim(); if(!name)return;
  const {data,error}=await supabase.rpc("create_room",{p_name:name});
  if(error){alert(error.message);return;}
  $("roomName").value=""; await loadRooms(); await openRoom(data);
});
$("roomList").addEventListener("click",event=>{
  const button=event.target.closest("[data-room]"); if(button) openRoom(button.dataset.room).catch(error=>alert(error.message));
});
$("messageForm").addEventListener("submit",async event=>{
  event.preventDefault(); if(!currentRoom)return;
  const body=$("messageText").value.trim(); if(!body)return;
  $("messageText").disabled=true;
  const {error}=await supabase.from("room_messages").insert({room_id:currentRoom.id,user_id:user.id,body});
  $("messageText").disabled=false;
  if(error){alert(error.message);return;}
  $("messageText").value="";
});
$("inviteButton").addEventListener("click",async()=>{
  if(!currentRoom)return;
  $("invitePanel").hidden=!$("invitePanel").hidden;
  if($("invitePanel").hidden)return;
  $("inviteMessage").textContent="Creating a seven-day viewer invitation…";
  const {data,error}=await supabase.rpc("create_room_invite",{p_room_id:currentRoom.id,p_role:"viewer",p_expires_at:new Date(Date.now()+7*86400000).toISOString(),p_max_uses:10});
  if(error){$("inviteMessage").textContent=error.message;return;}
  const link=new URL(location.href);link.searchParams.set("invite",data);
  $("inviteLink").value=link.toString();
  $("inviteRoleLabel").textContent="· Viewer · expires in 7 days · up to 10 uses";
  $("inviteMessage").textContent="Anyone with this link must sign in. Share it only with intended collaborators.";
});
$("copyInvite").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText($("inviteLink").value);$("inviteMessage").textContent="Invitation link copied.";}
  catch{$("inviteLink").select();$("inviteMessage").textContent="Select and copy the invitation link.";}
});
if (!supabase) {
  status("Configuration needed");
  authMessage("Connect a Supabase project to enable accounts and shared rooms. No data is stored in this prototype.",true);
} else {
  supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>initializeSession(session).catch(error=>{status("Connection issue");console.error(error);authMessage(error.message,true);}),0);});
  supabase.auth.getSession().then(({data,error})=>{if(error)throw error;return initializeSession(data.session);})
    .catch(error=>{status("Connection issue");authMessage(error.message,true);});
}
