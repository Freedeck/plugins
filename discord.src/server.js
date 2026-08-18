universal.on("discord_vc_tile_update", (data) => {
  if(universal.plugins.discord.Settings.usetbg.value == 'true') universal.send('textbg-display', data.text)
  
  if(data.channelName || data.serverName) {
    universal.UI.visual.typeChangeText('discord.cvc', data.channelName)
    universal.UI.visual.typeChangeText('discord.cs', data.serverName)
    universal.UI.visual.typeChangeText('discord.cvcs', data.channelName +' | ' + data.serverName)
  } else {
    universal.UI.visual.typeChangeText('discord.cvc', '')
    universal.UI.visual.typeChangeText('discord.cs', '')
    universal.UI.visual.typeChangeText('discord.cvcs', 'Not in a VC')
  }
});