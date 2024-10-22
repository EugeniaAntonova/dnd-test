function animate({ timing, draw, duration }) {
    return new Promise(resolve => {
        let start = performance.now();

        requestAnimationFrame(function animate(time) {
            let timeFraction = (time - start) / duration;
            if (timeFraction > 1) timeFraction = 1;

            let progress = timing(timeFraction);

            draw(progress);

            if (timeFraction < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        })
    });
}

function makeEaseOut(timing) {
    return function (timeFraction) {
        return 1 - timing(1 - timeFraction);
    };
}

function bounce(timeFraction) {
    for (let a = 0, b = 1; 1; a += b, b /= 2) {
        if (timeFraction >= (7 - 4 * a) / 11) {
            return (
                -Math.pow((11 - 6 * a - 11 * timeFraction) / 4, 2) + Math.pow(b, 2)
            );
        }
    }
}

function quad(timeFraction) {
    return Math.pow(timeFraction, 2)
}

let bounceEaseOut = makeEaseOut(bounce);
let quadEaseOut = makeEaseOut(quad);

class ProductsCreator {
    constructor() {
        this.getData(this.onDataSuccess, this.onDataFail);
        this.shelfes = [...document.querySelectorAll('.shelf')];
        this.stall = document.querySelector('.shelfes');
        this.products = [];

    }

    selectors = {
        element: 'data-product-dnd',
    }

    constants = {
        imgPath: './assets/',
        animationDelay: 1.4
    }

    positionProduct() {
        let stallTop = this.stall.offsetTop;
        let stallLeft = this.stall.offsetLeft;
        let shelfWidth = this.shelfes[0].offsetWidth;
        let startingIndex = 0;
        this.shelfes.forEach(shelf => {
            let shelTop = shelf.offsetTop;
            let shelLeft = shelf.offsetLeft;
            let shelfHeight = shelf.offsetHeight;
            let capacity = parseInt(shelf.dataset.shelfCapacity);
            let productsForShelf = this.products.slice(startingIndex, startingIndex + capacity);
            let gap = Math.floor((shelfWidth - getProductsWidth(productsForShelf)) / capacity);
            let accumulatedWidth = 0;
            productsForShelf.forEach((product, index) => {
                let productWidth = product.querySelector('img').width;
                let productHeight = product.querySelector('img').height;
                let top = stallTop + shelTop + shelfHeight - productHeight + 10;
                let left = stallLeft + shelLeft + gap * (index + 1) + accumulatedWidth;
                product.style.setProperty('--top', `${top}px`);
                product.style.setProperty('--left', `${left}px`);
                accumulatedWidth += productWidth;
            })
            startingIndex += capacity;
        })
        function getProductsWidth(products) {
            return products.reduce((accumulator, item) => accumulator + item.querySelector('img').width, 0);
        }
    }

    createProduct(product) {
        const { img, name, width, height } = { ...product };
        const wrapper = document.createElement('div');
        wrapper.classList.add(`${name}`, 'draggable');
        wrapper.setAttribute(this.selectors.element, true);
        wrapper.insertAdjacentHTML('beforeend', `<img src="${this.constants.imgPath + img}" width="${width}"  height="${height}">`);
        this.products.push(wrapper);
    }

    onDataSuccess = (data) => {
        data.forEach((product) => { this.createProduct(product) });
        this.positionProduct();
        this.products.forEach((product, index) => {
            product.style.setProperty('--delay', `${this.constants.animationDelay + index / 10}s`);
            document.body.append(product);
        });
        window.addEventListener('resize', () => this.positionProduct())
    }

    onDataFail = (error) => {
        console.log(error)
    }

    getData = async (onSuccess, onFail) => {
        try {
            const response = await fetch(
                './data.json'
            );

            if (!response.ok) {
                throw new Error('Не удалось получить данные');
            }

            const resp = await response.json();
            const data = resp.data;
            onSuccess(data);
        } catch (error) {
            onFail(error.message);
        }
    };
}

class DragAndDrop {
    selectors = {
        product: '[data-product-dnd]',
        cart: '[data-cart]'
    }

    stateClasses = {
        isDragging: 'is-dragging',
        isInCart: 'is-in-cart',
        isFlyingBack: 'fly-back'
    }

    initialState = {
        offsetX: null,
        offsetY: null,
        x: null,
        y: null,
        isDragging: false,
        currentDraggingElement: null,
    }

    startingPosition = {
        startingX: 0,
        startingY: 0,
    }

    constructor() {
        this.state = { ...this.initialState };
        this.isMobile = this.isItMobileDevice();
        this.bindEvents(this.isMobile);
        this.maxWidth = window.innerWidth;
        this.maxHeight = window.innerHeight;

        this.cart = document.querySelector(this.selectors.cart);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    putItemBack() {
        let product = this.state.currentDraggingElement;
        let curentX = parseFloat(this.state.x);
        let curentY = parseFloat(this.state.y);

        let delX = curentX - parseFloat(this.startingPosition.startingX);
        let delY = curentY - parseFloat(this.startingPosition.startingY);

        function animateProduct(product) {
            return animate({
                duration: 300,
                timing: quadEaseOut,
                draw: function (progress) {
                    product.style.setProperty('--left', `${curentX - delX * progress}px`);
                    product.style.setProperty('--top', `${curentY - delY * progress}px`);
                }
            });
        }
        animateProduct(product);
    }

    resetState() {
        if (!this.state.currentDraggingElement.classList.contains(this.stateClasses.isInCart)) {
            this.putItemBack();
        }
        this.state = { ...this.initialState };
    }

    placeItemInCart() {

    }

    onTouchStart(evt) {
        const { target } = evt;
        const isDraggable = target.matches(this.selectors.product);
        if (!isDraggable) return;

        evt.target.classList.add(this.stateClasses.isDragging);
        const { left, top } = target.getBoundingClientRect();
        const { height, width } = target.getBoundingClientRect();

        const firstTouch = evt.touches[0];

        this.state = {
            offsetX: firstTouch.clientX - left,
            offsetY: firstTouch.clientY - top,
            isDragging: true,
            currentDraggingElement: target,
            width: width,
            height: height
        }

        this.startingPosition.startingX = window.getComputedStyle(target).left;
        this.startingPosition.startingY = window.getComputedStyle(target).top;
    }

    onTouchMove(evt) {
        if (!this.state.isDragging) return;
        evt.preventDefault();

        let target = this.state.currentDraggingElement;

        let x = evt.touches[0].clientX - this.state.offsetX;
        let y = evt.touches[0].clientY - this.state.offsetY;

        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + this.state.width > this.maxWidth) x = this.maxWidth - this.state.width;
        if (y + this.state.height > this.maxHeight) y = this.maxHeight - this.state.height;
        this.state.x = x;
        this.state.y = y;

        requestAnimationFrame(() => {
            target.style.setProperty('--left', `${x}px`);
            target.style.setProperty('--top', `${y}px`);
        });
    }

    onTouchEnd() {
        if (!this.state.isDragging) return;

        this.state.currentDraggingElement.classList.remove('is-dragging');
        this.resetState()
    }

    onPointerDown(evt) {
        let { target, x, y } = evt;
        const isDraggable = target.matches(this.selectors.product);
        if (!isDraggable) return;
        target.classList.add(this.stateClasses.isDragging);
        const { left, top } = target.getBoundingClientRect();
        const { height, width } = target.getBoundingClientRect();
        this.state = {
            offsetX: x - left,
            offsetY: y - top,
            isDragging: true,
            currentDraggingElement: target,
            width: width,
            height: height
        }

        this.startingPosition.startingX = window.getComputedStyle(target).left;
        this.startingPosition.startingY = window.getComputedStyle(target).top;
    }

    onPointerMove(evt) {
        if (!this.state.isDragging) return;

        const target = this.state.currentDraggingElement;

        let x = evt.pageX - this.state.offsetX;
        let y = evt.pageY - this.state.offsetY;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x > this.maxWidth) x = this.maxWidth - this.state.width;
        if (y > this.maxHeight) y = this.maxHeight - this.state.height;

        this.state.x = x;
        this.state.y = y;

        requestAnimationFrame(() => {
            target.style.setProperty('--left', `${x}px`);
            target.style.setProperty('--top', `${y}px`);
        });
    }

    onPointerUp() {
        if (!this.state.isDragging) return;

        this.state.currentDraggingElement.classList.remove('is-dragging');
        this.resetState()
    }

    isItMobileDevice() {
        const reMobiles = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Touch|pixel/i;
        const reMac = /Macintosh/i;
        const agent = navigator.userAgent;

        const isMobile = reMobiles.test(agent);
        const isBigIpad = reMac.test(agent) && navigator.maxTouchPoints > 0;
        const isSmall = Math.max(window.innerHeight, window.innerWidth) <= 1600 && navigator.maxTouchPoints > 0;
        const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

        return isMobile || isBigIpad || isSmall || hasCoarsePointer;
    };

    onWindowResize() {
        this.state = { ...this.initialState };
        this.isMobile = this.isItMobileDevice();
        this.bindEvents(this.isMobile);
        this.maxWidth = window.innerWidth;
        this.maxHeight = window.innerHeight;
    }

    bindEvents(isMobile) {
        if (isMobile) {
            document.addEventListener('touchstart', (evt) => this.onTouchStart(evt));
            document.addEventListener('touchmove', (evt) => this.onTouchMove(evt), { passive: false });
            document.addEventListener('touchend', () => this.onTouchEnd());
            return;
        }
        document.addEventListener('pointerdown', (evt) => this.onPointerDown(evt));
        document.addEventListener('pointermove', (evt) => this.onPointerMove(evt));
        document.addEventListener('pointerup', () => this.onPointerUp());
    }
}

new ProductsCreator();
new DragAndDrop();