# Super Famicom listing — site

Ce dépôt contient une copie du fichier `listing.csv` et un site statique dans `docs/`.

Pour publier sur GitHub Pages :

1. Poussez ce repo sur GitHub (branche `main` ou `master`).
2. Dans les Settings du repo → Pages, choisissez la source `Branch: main` et `Folder: /docs`.
3. Le site sera disponible quelques minutes après l'activation. L'index est `docs/index.html`.

Notes :
- Le CSV est copié dans `docs/listing.csv` pour que la page puisse le charger côté client.
- Le site est en HTML/CSS/JS sans framework; il propose une recherche et un filtre par catégorie.
- Si tu veux, je peux : ajouter pagination, tri ou exporter JSON pour usage API.
