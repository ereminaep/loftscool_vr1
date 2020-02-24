ymaps.ready(function() {

    let coords; // координаты клика по точке
    let balloons = []; // координаты активного балуна
    let data = []; // контейнер с данными
    let map = document.querySelector('#map'); // карта
    let close = document.querySelector('.reviewForm__close'); // кнопка закрытия формы
    let add = document.querySelector('.addReview__button'); // кнопка добавления отзыва
    let go = document.querySelectorAll('.goform'); //ссылка с балуна

    /* данные отзывов */
    if (localStorage.getItem('item')) {
        data = JSON.parse(localStorage.getItem('item'));
    }

    /*языковые файлы*/
    const REVIEW_NONE = 'Отзывов пока нет...';

    /*шаблоны*/
    let templateReview = Handlebars.compile("<div class='reviewItem'><div class='reviewItem__header'><div class='reviewItem__reviewAutor'>{{name}}</div><div class='reviewItem__reviewPlace'>{{place}}</div><div class='reviewItem__reviewData'>{{date}}</div></div><div class='reviewItem__content'>{{message}}</div></div>");
    let balloonContent = Handlebars.compile("<a href='#' data-item='{{coords}}' class='goform'>{{adress}}</a><br/>{{message}}");

    /* открыть форму добавления отзыва */
    function showForm() {
        let [reviewForm, reviewList] = [document.querySelector('.reviewForm'), document.querySelector('.reviewList')];

        reviewList.innerHTML = REVIEW_NONE;
        reviewForm.classList.toggle('active');
    }

    /* получение текущей даты в формате */
    function formatDate(date) {
        let now = [date.getDate(), date.getMonth() + 1, date.getFullYear() % 100, date.getHours(), date.getMinutes(), date.getSeconds()];

        for (let i = 0; i < now.length; i++) {
            if (now[i] < 10) {
                now[i] = '0' + now[i];
            }
        }

        return now[0] + '.' + now[1] + '.' + now[2] + ' ' + now[3] + ':' + now[4] + ':' + now[5];
    }

    /* обновить либо пополнить базу точек */
    function reloadBd(item) {
        data = [];
        if (localStorage.getItem('item') != '') {
            data = JSON.parse(localStorage.getItem('item'));
        }
        data.push(item);
        localStorage.setItem('item', JSON.stringify(data));
    }

    /* добавить отзыв о месте в в базу */
    function addReview(coords) {

        let name = document.querySelector('.addReview__input[name="name"]'); // поле Имя
        let place = document.querySelector('.addReview__input[name="place"]'); // поле Место
        let message = document.querySelector('.addReview__textarea'); // поле Комментарий
        let adress = document.querySelector('.reviewForm__adress'); // адрес
        let date = new Date();
        let item = {
            'name': name.value,
            'place': place.value,
            'message': message.value,
            'data': formatDate(new Date()),
            'coords': coords,
            'adress': adress.textContent,
            'id': date.getTime(),
        };

        reloadBd(item);

        [name.value, place.value, message.value] = ['', '', ''];
        return item;
    };

    /* показать отзывы, заполненные по координатам*/
    function showRewiew() {

        let reviewList = document.querySelector('.reviewList');
        reviewList.innerHTML = '';
        let filtered = [];
        let filteredBalloons = [];

        if (balloons.length > 0) {
            for (let i = 0; i < balloons.length; i++) {
                r = data.filter(item => item.coords[0] == balloons[i][0] && item.coords[1] == balloons[i][1]);
                for (let j = 0; j < r.length; j++) {
                    filteredBalloons.push(r[i]);
                }
            }

            filtered = filteredBalloons.sort(function(a, b) { return a.id < b.id ? -1 : 1; }).reduce(function(filteredBalloons, el) {
                if (!filteredBalloons.length || filteredBalloons[filteredBalloons.length - 1].id != el.id) {
                    filteredBalloons.push(el);
                }
                return filteredBalloons;
            }, []);
            coords = balloons[0];
            balloons = [];
        } else {
            filtered = data.filter(item => item.coords[0] == coords[0] && item.coords[1] == coords[1]);
        }

        for (let i = 0; i < filtered.length; i++) {
            let item = templateReview({ name: filtered[i].name, place: filtered[i].place, date: filtered[i].data, message: filtered[i].message });
            reviewList.innerHTML = reviewList.innerHTML + item;
        }
    }

    /* добавление на карту точку с балуном */
    function addPount(myMap, coords, item) {

        let placemarkt = new ymaps.Placemark(coords, {
            balloonContentHeader: item.place,
            balloonContentBody: balloonContent({ coords: coords, adress: item.adress, message: item.message }),
            balloonContentFooter: item.data,
            clusterCaption: item.name
        }, {
            preset: 'islands#violetIcon',
        });

        myMap.geoObjects.add(placemarkt);
        clusterer.add(placemarkt);
    }

    /* события */
    close.onclick = showForm; // закрыть форму при клике на крест

    /* добавить отзыв при клике на кнопку добавления */
    add.onclick = function(e) {
        e.preventDefault;
        let item = addReview(coords);
        showRewiew(coords, balloons);
        addPount(myMap, coords, item);

    };

    /* отслеживаем клик по адресу из балуна */
    map.onclick = function(e) {
        console.log(e);
        if (e.target.className == 'goform') {
            e.preventDefault;
            myMap.balloon.close();
            showForm();
            showRewiew(e.target.dataset.item.split(','));
        }
    };

    var myMap = new ymaps.Map('map', {
            center: [55.751574, 37.573856],
            zoom: 12,
        }, {
            searchControlProvider: 'yandex#search',
            yandexMapDisablePoiInteractivity: true,
        }),
        clusterer = new ymaps.Clusterer({
            preset: 'islands#invertedVioletClusterIcons',
            clusterBalloonContentLayout: 'cluster#balloonCarousel',
            groupByCoordinates: false,
            clusterHideIconOnBalloonOpen: false,
            geoObjectHideIconOnBalloonOpen: false
        });


    /* показываем форму при клике на карту */
    myMap.events.add('click', function(e) {
        coords = e.get('coords');
        ymaps.geocode(coords).then(function(res) {
            var first = res.geoObjects.get(0),

                name = first.properties.get('name');
            let adressBlock = document.querySelector('.reviewForm__adress');
            adressBlock.textContent = name;
        }).then(showForm());
    });

    clusterer.events
        .add(['click'], function(e) {

            let target = e.get('target'),
                type = e.get('type');
            balloons = [];
            /* в случае клика по кластеру, показываем балун и вычисляем отзывы, которые соответствуют группе, иначе открываем форму */
            if (typeof target.getGeoObjects != 'undefined') {
                for (let i = 0; i < target.getGeoObjects().length; i++) {
                    balloons.push(target.getGeoObjects()[i].geometry.getBounds()[0]);
                }
            } else {
                showForm();
                coords = target.geometry.getBounds()[0];
                showRewiew(coords);
                target.options.set('hasBalloon', false);
            }
        });

    let getPointData = function(index) {
            return {
                balloonContentHeader: data[index].place,
                balloonContentBody: balloonContent({ coords: data[index].coords, adress: data[index].adress, message: data[index].message }),
                balloonContentFooter: data[index].data,
                clusterCaption: data[index].name
            };
        },

        getPointOptions = function() {
            return {
                preset: 'islands#violetIcon'
            };
        };

    let points = [];

    for (let i = 0; i < data.length; i++) {

        let newIco = new ymaps.Placemark(data[i].coords, {}, {
            iconColor: '#7e1f96'
        });

        newIco.events.add('click', function(e) {
            e.preventDefault;
            showForm();
        })

        points.push(data[i].coords);
    }

    geoObjects = [];
    for (let i = 0, len = points.length; i < len; i++) {
        geoObjects[i] = new ymaps.Placemark(points[i], getPointData(i), getPointOptions());
    }
    clusterer.add(geoObjects);
    clusterer.options.set({
        gridSize: 80,
        clusterDisableClickZoom: true
    });
    myMap.geoObjects.add(clusterer);
    myMap.setBounds(clusterer.getBounds(), {
        checkZoomRange: true
    });
});