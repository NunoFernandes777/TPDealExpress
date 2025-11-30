const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { token } = require('morgan');

const ROLES = {
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin'
};

const ROLE_HIERARCHY = {
    [ROLES.USER]: 1,
    [ROLES.MODERATOR]: 2,
    [ROLES.ADMIN]: 3
}

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.USER
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

UserSchema.pre('save', async function (next){
    if(!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password =  await bcrypt.hash(this.password, salt);
        next();
    }catch (error) {
        return next(error);
    }
})

UserSchema.methods.comparePassword = async function(passwordFromUser) {
    return bcrypt.compare(passwordFromUser, this.password);
}

UserSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    return userObject;
}


 
const User = mongoose.model('User', UserSchema);

User.ROLES = ROLES;

module.exports = User;
