universal.on('oc_cs', (data) => {
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter == null) return;

    if (inter.type == 'obs.cs') {
      btn.innerText = data;
    }
  })
})

universal.on('oc_vo', (data) => {
  document.querySelectorAll('.button').forEach((btn) => {
    let inter = JSON.parse(btn.getAttribute('data-interaction'));
    if (inter == null) return;

    if (inter.type == 'obs.v.' + data.uuid) {
      btn.querySelector('.slider-container').dataset.value = Math.round(data.inputVolumeDb);
    }
  })
});

document.querySelectorAll('.button').forEach((btn) => {
  let inter = JSON.parse(btn.getAttribute('data-interaction'));
  if (inter != null) {
    if(inter.type == 'obs.cs') {
      universal.send('oc_cs');
    }
    if(inter.type.startsWith('obs.v.')) {
      let uuid = inter.type.split('obs.v.')[1];
      universal.send('oc_vo', {name: inter.data.name, uuid: uuid});
    }
  }
})