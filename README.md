# Term VI timetable planner

Open `index.html` in a modern browser to use the app. It is a static site with no build step or server dependency. Your selected courses are saved in the browser on that device.

On phones, the planner panels stack vertically and the weekly timetable scrolls sideways to show all seven days.

## Publish at `<username>.github.io`

1. On GitHub, create a repository named exactly `<your-GitHub-username>.github.io`. Leave “Add a README” unchecked; this folder already contains one.
2. Open PowerShell in this project folder and run the commands below, replacing `<username>` with your GitHub username:

   ```powershell
   git add .
   git commit -m "Build Term VI timetable planner"
   git branch -M main
   git remote add origin https://github.com/<username>/<username>.github.io.git
   git push -u origin main
   ```

3. On GitHub, open the repository’s **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, set the branch to `main` and the folder to `/(root)`, then save.
4. After GitHub finishes publishing, visit `https://<username>.github.io/`. The first publish can take several minutes.

The address above is the free GitHub Pages domain. A project repository with another name uses `https://<username>.github.io/<repository-name>/` instead. A separately purchased custom domain needs additional DNS setup.

## Data note

The catalogue lists 29 offered courses after excluding **Understanding the Indian Bazar (MK-270)** per the faculty scheduling update. The supplied schedule workbook labels its sheet “Term V”; its other placements match the Term VI catalogue. The schedule has 77 class placements. Class locations are not provided.
