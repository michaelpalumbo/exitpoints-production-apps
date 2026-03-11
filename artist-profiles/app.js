
const fs = require('fs');
const path = require('path');

const { getLastFridayOfMonthFormatted, getShowNumber } = require("../lib/getShowNumber");

const filePath = path.join(__dirname, 'data.json');

let websiteUpdate = []


try {
    const rawData = fs.readFileSync(filePath, 'utf8'); // Read the file synchronously
    const thisMonth = JSON.parse(rawData); // Parse JSON data

    let concertDate = getLastFridayOfMonthFormatted()
    let concertNumber = getShowNumber()
    websiteUpdate.push({
        header: true,
        date: concertDate,
        number: concertNumber,
        concertID: 'EP' + concertNumber,
        slug: `concert${concertNumber}`,
        
    })

    console.log('\n\nShow date (verify!): ', concertDate, '\n\nShow Number (verify!):', concertNumber, '\n\n')

    let ig = `instagramUsernameAndorBlueskyIfYouDontHaveOneJustSayNa`
    let artistName = `artistNameIfApplicableIllUseThisInAllPromoEtcIfNotSayNa`
    let bio = `bioMaximumLength125WordsPlease`
    let collabPostPermission = 'iWillBeCreatingAnArtistProfileOnMyInstagramFeedIfYouUseInstagramCanIHaveYourPermissionToInviteYouToCollaborateOnThePostItsSimpleYouWouldJustAcceptTheInvitationAndThenMyPostWillAppearOnYourFeed'
    let concertInfo = `**Friday, ${concertDate}**\n📍 Venue: Array Music, 155 Walnut Ave, 2nd Floor. Accessible building (ramp, elevator, washroom).\n🎟️ Tickets: $15 early bird / $20 adv / $25 door – www.exitpoints.org\n🚪 Doors: 7:30 pm | 🎶 Show: 8 pm sharp`
    let igHandles = ``
    thisMonth.forEach((artist)=>{
        if(artist[ig] && artist[ig] != 'n/a' && artist[ig] != 'N/a' && artist[ig] != 'N/A'){
            if(!artist[ig].includes('@')){
                igHandles += `@${artist[ig]} `
            } else {
                igHandles += `${artist[ig]} `
            }
        }
    })
    igHandles += `@michaelpalumbo_ @arraymusictoronto @torevent.ca`

    let profileDoc = ``

    thisMonth.forEach((artist, index)=>{
        profileDoc += `\n\n===========`
        console.log(artist.name)

        let entry = {}
        // add note to self about whether artist gave permission to make a collaborative post
        if(artist[collabPostPermission] === 'No'){
            profileDoc += `\n\nNOTE TO SELF: Artist DID NOT give permission to make a collaborative post`
        }         
        // add artist name
        if(artist[artistName] && artist[artistName] != 'n/a' && artist[artistName] != 'N/a' && artist[artistName] != 'N/A'){
            const dispName = artist[artistName];
            
            profileDoc += `\n\nPerformer profile for Exit Points ${concertNumber} on ${concertDate} (Tickets at exitpoints.org): ${dispName} `

            // update website profile entry
            entry.id = slugify(dispName)

            entry.name = dispName
        } else {
            const dispName = artist.name;
            profileDoc += `\n\nPerformer profile for Exit Points ${concertNumber} on ${concertDate} (Tickets at exitpoints.org): ${dispName} `;
            entry.id = slugify(dispName);
            entry.name = dispName;
        }
        // add instagram
        if(artist[ig] && artist[ig] != 'n/a' && artist[ig] != 'N/a' && artist[ig] != 'N/A'){
            if(!artist[ig].includes('@')){
                profileDoc += `@${artist[ig]}`

                entry.instagramUrl = `https://instagram.com/${artist[ig]}`
                entry.instagram = `@${artist[ig]}`
            } else {
                profileDoc += artist[ig]
                entry.instagramUrl = `https://instagram.com/${artist[ig].replace('@', '')}`
                entry.instagram = artist[ig]
            }
            
        }
        // add bio
        profileDoc += `\n\n${artist[bio]}`
        entry.bio = artist[bio]
        // add concert info
        profileDoc += `\n\n${concertInfo}`
        // add ig handles
        profileDoc += `\n\n${igHandles}`

        // add hashtags
        profileDoc += `\n\n#exitpoints #exitpointsmusic #tkaronto #musicians #freeimprovisation #freeimprovisationmusic #electroacoustic #electroacousticmusic #experimentalsound #performance #concert #switchemups #goodlisteners #arraymusic #arraymusictoronto #improvisation #improvisedmusic #music #show`
        entry.images = [`${entry.id.split('-')[0]} 1.`] || [ `${ entry.id } 1.` ]
        websiteUpdate.push(entry)
    })
    // console.log(profileDoc)
    fs.writeFileSync('artist-profiles.txt', profileDoc)
    fs.writeFileSync('website.json', JSON.stringify(websiteUpdate, null, 2))

    // ------- update website repo -------

    // adjust this to wherever your /exitpoints repo lives relative to this script
    const siteBasePath = path.join(__dirname, '../../', 'exitpoints');

    // attach thumbnailUrl + gallery based on filenames in the site repo
    // attachArtistImages(websiteUpdate, concertNumber, siteBasePath);

    // upsert into /exitpoints/public/concerts.json
    upsertConcertArtists(websiteUpdate, concertNumber, siteBasePath);
    

} catch (error) {
    console.error("Error loading JSON file:", error);
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}



function upsertConcertArtists(artists, concertNumber, siteBasePath) {
  const concertsJsonPath = path.join(siteBasePath, 'public', 'concerts.json');
  let data;

  if (fs.existsSync(concertsJsonPath)) {
    try {
      const raw = fs.readFileSync(concertsJsonPath, 'utf8');
      data = JSON.parse(raw);
    } catch (err) {
      console.error('\n[upsertConcertArtists] Error parsing concerts.json:', err.message);
      process.exit(1);
    }
  } else {
    data = { concerts: [] };
  }

  if (!Array.isArray(data.concerts)) {
    data.concerts = [];
  }

  let concert = data.concerts.find(c => c.number === concertNumber);

  if (!concert) {
    // If the concert entry doesn't exist yet, create a barebones one.
    // You can later flesh out title/date/etc by hand or with another script.
    concert = {
      number: concertNumber,
      slug: `concert${concertNumber}`,
      title: `Exit Points ${concertNumber}`,
      datetime: '',           // TODO: fill in via another script or manually
      doorsTime: '',
      venue: {},
      poster: {
        imageUrl: '',
        alt: '',
        credit: ''
      },
      ticket: {
        url: '',
        label: 'Buy tickets',
        provider: ''
      },
      artists: [],
      archive: {
        socialPosts: [],
        documentation: {
          photos: [],
          videos: []
        },
        album: {
          status: 'none',
          note: '',
          bandcampUrl: null,
          subvertUrl: null,
          releaseDate: null
        }
      }
    };
    data.concerts.push(concert);
  }

  // overwrite artists with the new list
  concert.artists = artists;

  // optional: sort concerts by number
  data.concerts.sort((a, b) => a.number - b.number);
  
  fs.writeFileSync(concertsJsonPath, JSON.stringify(data, null, 2));
  console.log(`\n[upsertConcertArtists] Updated artists for concert ${concertNumber} in concerts.json\n`);
}


console.log('\n\n\n\nURGENT: as of MAY 2025 google form columns have changed since script was made. need to update and ensure all column headers match the sorting here\n\n\n\n')