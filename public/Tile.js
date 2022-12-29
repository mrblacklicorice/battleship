class Tile {

    constructor(i, j, l) {
        this.i = i;
        this.j = j;
        this.l = l;

        this.x = i * l;
        this.y = j * l;

        // phantom
        this.hit = false;

        this.c = -1;
        this.s = -1;
    }

    show = () => {
        // fill(colors[this.c]);

        // noStroke();
        // strokeWeight((this.c == 0) ? 0 : 1);
        strokeWeight(1);
        // stroke(colors_bor[this.c]);
        fill("white");

        stroke(0);
        rect(this.x, this.y, this.l, this.l);
    }

    showShips = () => {
        if (this.s != -1) {
            fill("#316879");
            strokeWeight(2);

            stroke(0);
            rect(this.x, this.y, this.l, this.l);
        }
    }

    showPhantomMissiles = () => {
        if (this.hit) {
            console.log(this.hit);
            if (this.s != -1) {
                fill("#f47a60");
                noStroke();
                ellipse(this.x + Math.floor(this.l / 2), this.y + Math.floor(this.l / 2), 2 * Math.floor(this.l / 3), 2 * Math.floor(this.l / 3));
            } else {
                fill("#f47a60");
                noStroke();

                translate(this.x + this.l / 2, this.y + this.l / 2);
                rotate(PI / 4.0);

                rect(Math.floor(this.l / 6) - (this.l / 2), Math.floor(5 * this.l / 12) - (this.l / 2), 2 * Math.floor(this.l / 3), 1 * Math.floor(this.l / 6));
                rect(Math.floor(5 * this.l / 12) - (this.l / 2), Math.floor(this.l / 6) - (this.l / 2), 1 * Math.floor(this.l / 6), 2 * Math.floor(this.l / 3));

                rotate(-PI / 4.0);
                translate(-(this.x + this.l / 2), -(this.y + this.l / 2));
            }
        }
    }

    showMissiles = () => {
        if (this.c == 1) {
            fill("#316879");
            noStroke();
            ellipse(this.x + Math.floor(this.l / 2), this.y + Math.floor(this.l / 2), 2 * Math.floor(this.l / 3), 2 * Math.floor(this.l / 3));
        } else if (this.c == 0) {
            fill("#316879");
            noStroke();

            translate(this.x + this.l / 2, this.y + this.l / 2);
            rotate(PI / 4.0);

            rect(Math.floor(this.l / 6) - (this.l / 2), Math.floor(5 * this.l / 12) - (this.l / 2), 2 * Math.floor(this.l / 3), 1 * Math.floor(this.l / 6));
            rect(Math.floor(5 * this.l / 12) - (this.l / 2), Math.floor(this.l / 6) - (this.l / 2), 1 * Math.floor(this.l / 6), 2 * Math.floor(this.l / 3));

            rotate(-PI / 4.0);
            translate(-(this.x + this.l / 2), -(this.y + this.l / 2));
        }
    }

    click = (h) => {
        if (this.c == -1) {
            this.c = h ? 1 : 0;
        }
    }
}