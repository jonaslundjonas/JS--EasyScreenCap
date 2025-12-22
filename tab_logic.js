        function switchTab(tabName) {
            const videoContent = document.getElementById('videoContent');
            const screenshotContent = document.getElementById('screenshotContent');
            const tabVideo = document.getElementById('tabVideo');
            const tabScreenshot = document.getElementById('tabScreenshot');

            if (tabName === 'video') {
                videoContent.classList.remove('hidden');
                screenshotContent.classList.add('hidden');

                tabVideo.className = "w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 bg-white shadow ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2";
                tabScreenshot.className = "w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-400 hover:text-white hover:bg-white/[0.12] focus:outline-none focus:ring-2";
            } else {
                videoContent.classList.add('hidden');
                screenshotContent.classList.remove('hidden');

                tabVideo.className = "w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-400 hover:text-white hover:bg-white/[0.12] focus:outline-none focus:ring-2";
                tabScreenshot.className = "w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 bg-white shadow ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2";
            }
        }
