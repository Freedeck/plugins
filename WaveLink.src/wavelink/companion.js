universal.on('wl.stat', (data) => {
  data = JSON.parse(data);
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter == null) return;
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

    if ((inter.type == 'wl.v.' + data.input && data.type == 'v') ||
      (inter.type == 'wl.vm.' + data.input && data.type == 'vm')) {
      let sl = btn.querySelector('.slider-container');
      if (sl.dataset.dragging != 'true') sl.dataset.value = data.value;
    }
  })
})

const wl_handlePageChange = () => {
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter != null) {
      if (inter.type.startsWith('wl.m.') || inter.type.startsWith('wl.sm.')) {
        if (btn.querySelector('#wl_indi')) return;
        let type = inter.type.split('wl.')[1].split('.')[0];
        universal.send('wl.stat', inter.type.split('.').pop().trim() + "@" + type);
        btn.addEventListener('click', () => {
          setTimeout(() => {
            universal.send('wl.stat', inter.type.split('.').pop().trim() + "@" + type);
          }, 50);
        })
      } else if (inter.type.startsWith('wl.v') || inter.type.startsWith('wl.vm')) {
        universal.send('wl.vol', inter.type.split('.').pop().trim() + "@" + inter.type.split('.')[1]);
      }
    }
  })
}

wl_handlePageChange();

universal.listenFor('page_change', () => {
  wl_handlePageChange();
})

function setIndicatorToButton(btn, indicator) {
  if (!btn.querySelector('#wl_indi')) {
    let indicator = document.createElement('div');
    indicator.id = 'wl_indi';
    btn.appendChild(indicator);
  }
  const cl = btn.querySelector('#wl_indi').classList;
  cl.remove('indicator-red');
  cl.remove('indicator-green');
  cl.remove('indicator-yellow');
  cl.add('indicator-' + indicator);
}

function removeIndicatorFromButton(btn) {
  if (btn.querySelector('#wl_indi')) {
    btn.querySelector('#wl_indi').remove();
  }
}