universal.on('wl.stat', (data) => {
  data = JSON.parse(data);
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter == null) return;
    
    // Standardized to match the exact 'm' and 'sm' strings emitted by the server
    if ((inter.type == 'wl.m.' + data.input && data.type == 'm') ||
        (inter.type == 'wl.sm.' + data.input && data.type == 'sm')) {
      if (data.value == true) {
        setIndicatorToButton(btn, 'red');
      } else {
        setIndicatorToButton(btn, 'green');
      }
    }
  })
})

universal.on('wl.vol', (data) => {
  data = JSON.parse(data);
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter == null) return;
    // Standardized to match the exact 'v' and 'vm' strings emitted by the server
    if ((inter.type == 'wl.v.' + data.input && data.type == 'v') ||
    (inter.type == 'wl.vm.' + data.input && data.type == 'vm')) {
          console.log("WL.VOL", data, inter)
      let sl = btn.querySelector('.slider-container');
      if (sl) {
        sl.dataset.value = data.value;
      }
    }
  })
})

const wl_handlePageChange = () => {
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter != null) {
      
      // Handle Mutes (wl.m. and wl.sm.)
      if (inter.type.startsWith('wl.m.') || inter.type.startsWith('wl.sm.')) {
        if (btn.querySelector('#wl_indi')) return;
        
        // Extract 'm' or 'sm' cleanly
        let type = inter.type.split('.')[1]; 
        let channelName = inter.type.split('.').pop().trim();
        
        universal.send('wl.stat', channelName + "@" + type);
        
        btn.addEventListener('click', () => {
          setTimeout(() => {
            universal.send('wl.stat', channelName + "@" + type);
          }, 75); // Bumped slightly to guarantee the v2 SDK websocket round-trip completed
        })
      } 
      
      // Handle Volumes (wl.v. and wl.vm.)
      else if (inter.type.startsWith('wl.v.') || inter.type.startsWith('wl.vm.')) {
        let type = inter.type.split('.')[1]; // Extracts 'v' or 'vm'
        let channelName = inter.type.split('.').pop().trim();
        
        universal.send('wl.vol', channelName + "@" + type);
      }
    }
  })
}

wl_handlePageChange();

universal.listenFor('page_change', () => {
  wl_handlePageChange();
})

universal.listenFor('data_ready', () => {
  wl_handlePageChange();
})

function setIndicatorToButton(btn, indicator) {
  if (!btn.querySelector('#wl_indi')) {
    let indicatorEl = document.createElement('div');
    indicatorEl.id = 'wl_indi';
    btn.appendChild(indicatorEl);
  }
  const cl = btn.querySelector('#wl_indi').classList;
  cl.remove('indicator-red', 'indicator-green', 'indicator-yellow');
  cl.add('indicator-' + indicator);
}

function removeIndicatorFromButton(btn) {
  if (btn.querySelector('#wl_indi')) {
    btn.querySelector('#wl_indi').remove();
  }
}