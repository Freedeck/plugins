universal.repositoryManager.official[0].channel = 'demoshowcase'
const wantedRepo = universal.repositoryManager.official[0];
(async () => {
  const res = await universal.repositoryManager.getV3Repository(wantedRepo);
  for(const e of res.plugins) {
    e.id = e.id.toLowerCase();
    e.name = e.title;
    universal.plugins[e.id] = {
      ...e,
      Settings:[],
      imports:[],
      hooks:[],
      types:[],
      views: {},
      disabled:false,
      stopped:false,
      hasInit:true,
      popout: "<p>This plugin has been modified for demonstration purposes. Most features usually present may not work.</p>"
    };
  }
})();
universal.flags.set("app.freedeck.demo.disable_new_repo", "true");

universal.listenFor("page_change", () => {
  universal.ui.visual.typeChangeText("demo.time", "12:35:00 PM");
})


universal.listenFor("button", async (interaction) => {
  if(interaction.type === "demo.DSD") {
    universal.setPage(0);
    document.querySelector(".sidebar").scrollTo(0, 0);
    document.querySelector("#sdbtry").checked = true;
    document.querySelector("#MobileDevice").style.display = "none";
    document.querySelector("body").style.animation = "none";
    document.querySelector("body").style.cursor = "none"; 
    splashScreen.unsplash();
  }
  if(interaction.type === "demo.DSE") {
    universal.setPage(0);
    document.querySelector("body").style.animation = "none";
    document.querySelector("body").style.cursor = "none"; 
    document.querySelector("#sidebar").style.display = 'none';
    document.querySelector(".sidebar").style.display = 'none';
    document.querySelector("#keys").style.backgroundColor = 'transparent';
    document.querySelector("#keys").style.transform = 'transparent';
    document.querySelector("#keys").style.padding = '.25rem';
    document.querySelector(".center").style.top = '0';
    document.querySelector(".center").style.left = '0';
    document.querySelector(".center").style.transform = 'none';
    splashScreen.mobileEmu();
  }
})