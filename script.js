class productsCreator {
    constructor() {
        this.getData(this.onDataSuccess, this.onDataFail);
    }

    selectors = {
        parent: '[data-shelf]',
        element: '[data-product-dnd]',
    }

    paths = {
        imgPath: './assets/'
    }

    createProduct(product) {
        const { img, name, width } = { ...product };
        const wrapper = document.createElement('div');
        wrapper.classList.add(`${name}`, 'draggable');
        wrapper.insertAdjacentHTML('beforeend', `<img src="${this.paths.imgPath + img}" width="${width}">`);
        document.body.append(wrapper);
    }

    onDataSuccess = (data) => {
        data.forEach((product) => {this.createProduct(product)});
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

new productsCreator();