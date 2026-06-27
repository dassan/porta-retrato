(function () {
  'use strict';

  // Intervalo entre fotos (ms). Pode ser ajustado via ?interval=20000 na URL.
  var params = new URLSearchParams(window.location.search);
  var INTERVAL = parseInt(params.get('interval'), 10) || 30000;
  var REFRESH_LIST_EVERY = 10 * 60 * 1000; // reconsulta a lista de fotos a cada 10 min

  var layerA = document.getElementById('layerA');
  var layerB = document.getElementById('layerB');
  var messageEl = document.getElementById('message');
  var activeLayer = layerA;
  var inactiveLayer = layerB;

  var photos = [];
  var queue = [];

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function showMessage(text) {
    messageEl.textContent = text;
    messageEl.style.display = text ? 'block' : 'none';
  }

  function nextPhotoName() {
    if (queue.length === 0) {
      if (photos.length === 0) return null;
      queue = shuffle(photos);
    }
    return queue.shift();
  }

  function swapLayers() {
    activeLayer.className = 'layer';
    inactiveLayer.className = 'layer active';
    var tmp = activeLayer;
    activeLayer = inactiveLayer;
    inactiveLayer = tmp;
  }

  function showNext() {
    var name = nextPhotoName();
    if (!name) {
      showMessage('Adicione fotos na pasta "fotos-originais" do servidor');
      return;
    }

    var img = new Image();
    img.onload = function () {
      inactiveLayer.src = img.src;
      showMessage('');
      swapLayers();
    };
    img.onerror = function () {
      // pula para a próxima foto se essa falhar ao carregar
      showNext();
    };
    img.src = '/photos/' + encodeURIComponent(name) + '?t=' + Date.now();
  }

  function loadPhotoList(onFirstLoad) {
    fetch('/api/photos')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        photos = data.photos || [];
        queue = []; // força reembaralhar com a lista atualizada
        if (photos.length === 0) {
          showMessage('Nenhuma foto encontrada. Adicione fotos na pasta "fotos-originais" do servidor');
        }
        if (onFirstLoad) onFirstLoad();
      })
      .catch(function (err) {
        console.error('Falha ao carregar lista de fotos', err);
        showMessage('Não foi possível conectar ao servidor de fotos');
        if (onFirstLoad) setTimeout(function () { loadPhotoList(onFirstLoad); }, 5000);
      });
  }

  loadPhotoList(function () {
    showNext();
    setInterval(showNext, INTERVAL);
  });
  setInterval(loadPhotoList, REFRESH_LIST_EVERY);
})();
