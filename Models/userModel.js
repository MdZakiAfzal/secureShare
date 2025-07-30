const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "User is required to give a name"],
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, "User is required to give an email address"],
        unique: true,
        validate: [validator.isEmail, 'Please enter a valid email address']
    },
    role:{
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
    },
    confirmPassword: {
        type: String,
        required: true,
        validate: {
            validator: function(value) {
                return this.password === value;
            },
            message: 'Passwords do not match.'
        }
    },
    passwordChangedAt: {
        type: Date
    }
});

userSchema.pre('save', async function( next){
    if (!(this.isModified('password')))
        return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.confirmPassword = undefined;
    next();
})

userSchema.methods.comparePassword = async function(enteredPassword, usersPassword){
    return await bcrypt.compare(enteredPassword, usersPassword);
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    if(this.passwordChangedAt){
        const passchangedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10)
        return passchangedAt > JWTTimestamp;
    }
    return false;
}   



module.exports = mongoose.model('User', userSchema)