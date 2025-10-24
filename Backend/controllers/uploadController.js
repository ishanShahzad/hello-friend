const User = require('../models/User')
exports.profileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const user = await User.findByIdAndUpdate(req.user.id,
            {
                avatar: req.file.path
            }
        )
        await user.save()
        console.log('file request::::::::', req.file);
  

        // File is automatically uploaded to Cloudinary by multer-storage-cloudinary
        // The file information will be available in req.file

        res.json({
            message: 'Image uploaded successfully',
            imageUrl: req.file.path, // This is the Cloudinary URL 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ msg: 'Server error during upload' });
    }
}