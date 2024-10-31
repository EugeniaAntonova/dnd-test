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
                product.dataset.initX = left;
                product.dataset.initY = top;
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
            document.body.querySelector('.shop').append(product);
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
        cart: '.js-cart-space',
        cartContainer: '.js-cart-container',
        checkoutButton: '.js-checkout-btn',
        stall: '.shelfes'
    }

    stateClasses = {
        isDragging: 'is-dragging',
        isInCart: 'is-in-cart',
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

    cartContent = {
        count: 0
    }

    constructor() {
        this.state = { ...this.initialState };
        this.isMobile = this.isItMobileDevice();
        this.bindEvents(this.isMobile);
        this.maxWidth = window.innerWidth;
        this.maxHeight = window.innerHeight;

        this.cartCoords = {};
        this.getCartPosition(true);
        window.addEventListener('resize', () => this.onWindowResize());
    }

    getCartPosition(init) {
        const checkoutCart = document.querySelector(this.selectors.cartContainer);
        const cartSpace = document.querySelector(this.selectors.cart);

        function getCoords() {
            let cartSpaceCoords = cartSpace.getBoundingClientRect();
            let left = cartSpaceCoords.x;
            let right = left + cartSpaceCoords.width;
            let top = cartSpaceCoords.y;
            let bottom = top + cartSpaceCoords.height;

            return { left, right, top, bottom };
        }

        if (init) {
            let isAnimated = window.getComputedStyle(checkoutCart).animation.split(' ')[0] !== 'none';

            function animationEnd() {
                return new Promise((resolve) => {
                    checkoutCart.addEventListener('animationend', resolve);
                })
            }

            if (isAnimated) {
                let coords = {};
                animationEnd()
                    .then(() => { coords = getCoords() })
                    .then(() => { this.cartCoords = { ...coords }; })
                    .then(() => console.log(this.cartCoords));

                return;
            }

        }

        this.cartCoords = getCoords();
    }

    putItemBack() {
        let product = this.state.currentDraggingElement;
        let curentX = parseFloat(this.state.x);
        let curentY = parseFloat(this.state.y);

        if (!(curentX || curentY)) return;

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

    checkCart() {
        let cart = document.querySelector(this.selectors.cartContainer);
        if (this.cartContent.count > 0) {
            cart.classList.remove('empty');
        } else {
            cart.classList.add('empty');
        }
    }

    placeItemInCart(target) {
        let curentX = this.state.x;
        let currentY = parseFloat(this.state.y);
        let del = currentY - (this.cartCoords.bottom - target.clientHeight);
        function animateProduct(product) {
            return animate({
                duration: 300,
                timing: bounceEaseOut,
                draw: function (progress) {
                    product.style.setProperty('--left', `${curentX}px`);
                    product.style.setProperty('--top', `${currentY - del * progress}px`);
                }
            });
        }
        animateProduct(target);
        target.classList.add(this.stateClasses.isInCart);
        this.cartContent.count += 1;
        this.checkCart();
        return;
    }

    onPointerDown(evt, touch) {
        const { target } = evt;
        const isDraggable = target.matches(this.selectors.product);
        if (!isDraggable) return;
        target.classList.add(this.stateClasses.isDragging);
        const { left, top } = target.getBoundingClientRect();
        const { height, width } = target.getBoundingClientRect();
        let x = 0;
        let y = 0;
        if (touch) {
            const firstTouch = evt.touches[0];
            x = firstTouch.clientX;
            y = firstTouch.clientY;
        } else {
            x = evt.x;
            y = evt.y;
        }

        this.startingPosition.startingX = target.dataset.initX;
        this.startingPosition.startingY = target.dataset.initY;
        
        this.state = {
            offsetX: x - left,
            offsetY: y - top,
            isDragging: true,
            currentDraggingElement: target,
            width: width,
            height: height,
        }
        
    }

    onPointerMove(evt, touch) {
        if (!this.state.isDragging) return;
        let pageX = 0;
        let pageY = 0;
        if (touch) {
            evt.preventDefault();
            pageX = evt.touches[0].clientX;
            pageY = evt.touches[0].clientY;
        } else {
            pageX = evt.pageX;
            pageY = evt.pageY;
        }

        const target = this.state.currentDraggingElement;

        let x = pageX - this.state.offsetX;
        let y = pageY - this.state.offsetY;
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

        const x = this.state.x;
        const y = this.state.y;
        const target = this.state.currentDraggingElement;

        if (x > this.cartCoords.left && (x + this.state.width - this.state.offsetX * 1.5) < this.cartCoords.right && y + target.clientHeight > this.cartCoords.top && y < this.cartCoords.bottom) {
            this.placeItemInCart(target);
        } else {
            if (target.classList.contains(this.stateClasses.isInCart)) {
                this.startingPosition.startingX = target.dataset.initX;
                this.startingPosition.startingY = target.dataset.initY;
                target.classList.remove(this.stateClasses.isInCart);
                this.cartContent.count -= 1;
                this.checkCart();
            }
        }

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
        this.getCartPosition(false);
    }

    onCheckoutClick() {
        const cartContainer = document.querySelector('.checkout');
        const products = [...document.querySelectorAll(`${this.selectors.product}:not(.${this.stateClasses.isInCart})`)];
        const inCartProducts = [...document.querySelectorAll(`.${this.stateClasses.isInCart}`)];

        inCartProducts.forEach((product) => product.classList.add('leave'));

        cartContainer.classList.add('leave');
        cartContainer.addEventListener('transitionend', () => {
            products.forEach(product => product.classList.add('leave'));
            document.querySelector(this.selectors.stall).classList.add('leave');
            document.querySelector('.button--restart').classList.add('shown');
            document.querySelector('.button--restart').addEventListener('click', () => location.reload());
        }, { once: true });
    }
    

    bindEvents(isMobile) {
        if (isMobile) {
            document.addEventListener('touchstart', (evt) => this.onPointerDown(evt, isMobile));
            document.addEventListener('touchmove', (evt) => this.onPointerMove(evt, isMobile), { passive: false });
            document.addEventListener('touchend', () => this.onPointerUp());
        } else {
            document.addEventListener('pointerdown', (evt) => this.onPointerDown(evt, isMobile));
            document.addEventListener('pointermove', (evt) => this.onPointerMove(evt, isMobile));
            document.addEventListener('pointerup', () => this.onPointerUp());
        }
        document.querySelector(this.selectors.checkoutButton).addEventListener('click', () => this.onCheckoutClick());
    }
}

new ProductsCreator();
new DragAndDrop();