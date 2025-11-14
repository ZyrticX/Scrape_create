import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function fetchModels() {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`
            }
        });

        const data = await response.json();
        
        console.log('Total models:', data.data.length);
        console.log('\n=== Text Generation Models (first 10) ===');
        data.data
            .filter(m => !m.id.includes('image') && !m.id.includes('vision'))
            .slice(0, 10)
            .forEach(model => {
                console.log(`- ${model.id}`);
                console.log(`  Name: ${model.name}`);
                console.log(`  Context: ${model.context_length || 'N/A'}`);
                console.log('');
            });

        console.log('\n=== Image Generation Models ===');
        data.data
            .filter(m => m.id.includes('image') || m.id.includes('flux') || m.id.includes('stable-diffusion') || m.id.includes('dall'))
            .forEach(model => {
                console.log(`- ${model.id}`);
                console.log(`  Name: ${model.name}`);
                console.log('');
            });
    } catch (error) {
        console.error('Error fetching models:', error);
    }
}

fetchModels();




